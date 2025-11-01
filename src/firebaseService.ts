import {
  collection,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  Timestamp,
  runTransaction,
  getDoc,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "./firebase";
import type { GameState, LobbyState, Player } from "./types";
import { MAX_PLAYERS } from "./types";
import { dealCards, generateGameId, canSpellWord } from "./gameLogic";

const GAMES_COLLECTION = "games";

// Create a new game lobby
export async function createLobby(): Promise<{
  gameId: string;
  playerId: string;
  lobbyData: LobbyState;
}> {
  const gameId = generateGameId();
  const hostId = Math.random().toString(36).substring(2, 15);

  // Create TTL timestamp - 2 hours from now (for future use if billing is enabled)
  const expireAt = Timestamp.fromDate(
    new Date(Date.now() + 2 * 60 * 60 * 1000)
  );

  // Create a game in lobby phase (instead of separate lobby)
  const lobbyData: LobbyState & { phase: "lobby" } = {
    id: gameId,
    phase: "lobby",
    players: [
      {
        id: hostId,
        name: "Player 1",
        isHost: true,
      },
    ],
    hostId,
    expireAt,
  };

  await addDoc(collection(db, GAMES_COLLECTION), lobbyData);

  return { gameId, playerId: hostId, lobbyData };
}

// Join an existing lobby
export async function joinLobby(
  gameId: string
): Promise<{ success: boolean; playerId?: string }> {
  const gamesQuery = query(
    collection(db, GAMES_COLLECTION),
    where("id", "==", gameId),
    where("phase", "==", "lobby")
  );

  const querySnapshot = await getDocs(gamesQuery);

  if (querySnapshot.empty) {
    return { success: false };
  }

  const gameDoc = querySnapshot.docs[0];

  const playerId = Math.random().toString(36).substring(2, 15);
  const newPlayer: Omit<Player, "draftedCards" | "hand" | "score" | "name"> = {
    id: playerId,
    isHost: false,
  };

  // Use transaction to ensure atomic update
  await runTransaction(db, async (transaction) => {
    const freshDoc = await transaction.get(gameDoc.ref);
    if (!freshDoc.exists()) {
      throw new Error("Game document no longer exists");
    }

    const freshData = freshDoc.data() as LobbyState;
    (newPlayer as Player).name = `Player ${freshData.players.length + 1}`;
    const updatedPlayers = [...freshData.players, newPlayer];

    transaction.update(gameDoc.ref, {
      players: updatedPlayers,
    });
  });

  return { success: true, playerId };
}

// Update player name in lobby
export async function updatePlayerName(
  gameDocRef: DocumentReference,
  gameData: Pick<LobbyState, "players">,
  playerId: string,
  newName: string
): Promise<boolean> {
  // Validate player name length
  if (!newName || newName.length > 50) {
    throw new Error("Player name must be between 1 and 50 characters");
  }

  const playerIndex = gameData.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) {
    return false;
  }

  // Update the player's name
  const updatedPlayers = [...gameData.players];
  updatedPlayers[playerIndex] = {
    ...updatedPlayers[playerIndex],
    name: newName,
  };

  await updateDoc(gameDocRef, {
    players: updatedPlayers,
  });

  return true;
}

// Add a computer player to the lobby
export async function addComputerPlayer(
  gameDocRef: DocumentReference,
  gameData: Pick<LobbyState, "players">
): Promise<boolean> {
  if (gameData.players.length >= MAX_PLAYERS) {
    return false;
  }

  const computerPlayerId = Math.random().toString(36).substring(2, 15);
  const computerCount = gameData.players.filter((p) => p.isComputer).length;
  const newComputerPlayer: Omit<Player, "draftedCards" | "hand" | "score"> = {
    id: computerPlayerId,
    name: `Computer ${computerCount + 1}`,
    isHost: false,
    isComputer: true,
  };

  const updatedPlayers = [...gameData.players, newComputerPlayer];

  await updateDoc(gameDocRef, {
    players: updatedPlayers,
  });

  return true;
}

// Start the game (convert lobby to game)
export async function startGame(
  gameDocRef: DocumentReference,
  gameData: Pick<LobbyState, "players">
): Promise<boolean> {
  if (gameData.players.length < 2) {
    return false;
  }

  // Deal cards to players
  const hands = dealCards(gameData.players.length);
  const totalRounds = hands[0].length;

  // Update the existing document to convert from lobby to active game
  const updatedGameState = {
    phase: "drafting",
    players: gameData.players.map((player, index) => ({
      ...player,
      draftedCards: [],
      hand: hands[index],
    })),
    currentRound: 1,
    totalRounds,
    wordSpellingWinners: [],
  };

  // Update the existing document instead of creating a new one and deleting the old one
  await updateDoc(gameDocRef, updatedGameState);

  return true;
}

// Submit draft selection
export async function submitDraftSelection(
  gameDocRef: DocumentReference,
  gameData: Omit<GameState, "expireAt">,
  playerId: string,
  cardIndex: number
): Promise<boolean> {
  return submitMultipleDraftSelections(gameDocRef, gameData, [
    { playerId, cardIndex },
  ]);
}

// Submit multiple draft selections at once (batch operation)
export async function submitMultipleDraftSelections(
  gameDocRef: DocumentReference,
  gameData: Omit<GameState, "expireAt">,
  selections: Array<{ playerId: string; cardIndex: number }>
): Promise<boolean> {
  if (selections.length === 0) {
    return true;
  }

  // Validate all selections first
  for (const selection of selections) {
    const playerIndex = gameData.players.findIndex(
      (p) => p.id === selection.playerId
    );
    if (playerIndex === -1) {
      return false;
    }

    const player = gameData.players[playerIndex];
    if (selection.cardIndex < 0 || selection.cardIndex >= player.hand.length) {
      return false;
    }
  }

  // Apply all selections to players
  const updatedPlayers = [...gameData.players];
  for (const selection of selections) {
    const playerIndex = updatedPlayers.findIndex(
      (p) => p.id === selection.playerId
    );
    const player = updatedPlayers[playerIndex];

    // Move card from hand to drafted cards
    const selectedCard = player.hand[selection.cardIndex];
    const newHand = player.hand.filter(
      (_, index) => index !== selection.cardIndex
    );
    const newDraftedCards = [...player.draftedCards, selectedCard];

    updatedPlayers[playerIndex] = {
      ...player,
      hand: newHand,
      draftedCards: newDraftedCards,
    };
  }

  // Check if all players have made their selection for this round
  // Each player should have at least as many drafted cards as the current round number
  // This means everyone has drafted a card for the current round (creating an "unrevealed card")
  const allPlayersSelected = updatedPlayers.every(
    (player) => player.draftedCards.length >= gameData.currentRound
  );

  let updatedGameData = {
    ...gameData,
    players: updatedPlayers,
  };

  if (allPlayersSelected) {
    // Check if ALL players have empty hands (drafting complete)
    const allHandsEmpty = updatedPlayers.every((p) => p.hand.length === 0);

    if (allHandsEmpty) {
      // End drafting phase
      updatedGameData = {
        ...updatedGameData,
        phase: "scoring" as const,
      };
    } else {
      // Pass hands to the next player (drafting mechanic)

      // Create array of current hands
      const currentHands = updatedPlayers.map((p) => p.hand);

      // Pass hands to the left (each player gets the hand from the player to their right)
      const passedPlayers = updatedPlayers.map((player, index) => {
        const nextPlayerIndex = (index + 1) % updatedPlayers.length;
        return {
          ...player,
          hand: currentHands[nextPlayerIndex],
        };
      });

      updatedGameData = {
        ...updatedGameData,
        players: passedPlayers,
        currentRound: gameData.currentRound + 1,
      };
    }
  }

  // Read latest game state to avoid overwriting concurrent updates (e.g., word spelling)
  const gameDoc = await getDoc(gameDocRef);
  if (!gameDoc.exists()) {
    return false;
  }
  const latestGameData = gameDoc.data() as Omit<GameState, "expireAt">;
  
  // Preserve wordSpellingWinners from the latest game state to avoid overwriting concurrent word spelling
  await updateDoc(gameDocRef, {
    ...updatedGameData,
    wordSpellingWinners: latestGameData.wordSpellingWinners,
  });
  return true;
}

let words: Set<string> | undefined;

// Check for word spelling and update winners
export async function checkWordSpelling(
  gameDocRef: DocumentReference,
  gameData: Omit<GameState, "expireAt">,
  playerId: string,
  word: string
): Promise<void> {
  // Validate word length.
  if (!word || word.length < 3) {
    throw new Error("Word must be at least 3 letters");
  }

  const player = gameData.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error("Error. Try refreshing the page.");
  }

  // Read latest game state from Firestore to avoid race conditions
  const gameDoc = await getDoc(gameDocRef);
  if (!gameDoc.exists()) {
    throw new Error("Game not found");
  }
  const latestGameData = gameDoc.data() as Omit<GameState, "expireAt">;

  // Check if player already won word spelling (check latest data)
  if (
    latestGameData.wordSpellingWinners.some((winner) => winner.playerId === playerId)
  ) {
    throw new Error("You have already spelled a word.");
  }

  // Only allow using cards that have been revealed (drafted in previous rounds)
  // Cards drafted in the current round are not yet revealed to everyone
  const revealedCards = player.draftedCards.slice(0, latestGameData.currentRound - 1);

  if (revealedCards.length < 3) {
    throw new Error("You need at least 3 cards to spell a word.");
  }

  // Check if the player can spell this word with their revealed cards only
  const usedSymbols = canSpellWord(revealedCards, word);
  if (!usedSymbols) {
    throw new Error("Cannot spell this word with your drafted cards.");
  }

  // Verify at least 3 symbols were used
  if (usedSymbols.length < 3) {
    throw new Error("Word must use at least 3 atomic symbols.");
  }

  if (!words) {
    const res = await fetch("/assets/words.txt");
    const text = await res.text();
    words = new Set(text.split("\n").map((line) => line.toLowerCase()));
  }

  if (!words.has(word.toLowerCase())) {
    throw new Error("This word is not in our dictionary.");
  }

  // Read latest game state again right before updating to minimize race condition window
  // Note: We don't use a transaction here because it conflicts with concurrent draft selections
  // Instead, we read right before write and rely on Firestore's version control
  const finalGameDoc = await getDoc(gameDocRef);
  if (!finalGameDoc.exists()) {
    throw new Error("Game not found");
  }
  
  const finalGameData = finalGameDoc.data() as Omit<GameState, "expireAt">;
  
  // Double-check player hasn't already won (might have won since last check)
  if (
    finalGameData.wordSpellingWinners.some((winner) => winner.playerId === playerId)
  ) {
    throw new Error("You have already spelled a word.");
  }

  // Add player to winners list with current round and word
  const updatedWinners = [
    ...finalGameData.wordSpellingWinners,
    { playerId, round: finalGameData.currentRound, word },
  ];
  
  await updateDoc(gameDocRef, {
    wordSpellingWinners: updatedWinners,
  });
}
