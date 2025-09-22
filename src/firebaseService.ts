import {
  collection,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  Timestamp,
  runTransaction,
  DocumentReference,
} from "firebase/firestore";
import { db } from "./firebase";
import type { GameState, LobbyState, Player } from "./types";
import { gameData as chemistryElements } from "./data";
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
  const ttlTimestamp = Timestamp.fromDate(
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
    createdAt: Date.now(),
    ttl: ttlTimestamp, // TTL field for future use
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
  const gameData = gameDoc.data() as LobbyState;

  const playerId = Math.random().toString(36).substring(2, 15);
  const playerNumber = gameData.players.length + 1;
  const newPlayer: Omit<Player, "draftedCards" | "hand" | "score"> = {
    id: playerId,
    name: `Player ${playerNumber}`,
    isHost: false,
  };

  // Use transaction to ensure atomic update
  await runTransaction(db, async (transaction) => {
    const freshDoc = await transaction.get(gameDoc.ref);
    if (!freshDoc.exists()) {
      throw new Error("Game document no longer exists");
    }

    const freshData = freshDoc.data() as LobbyState;
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
  gameData: LobbyState,
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

// Start the game (convert lobby to game)
export async function startGame(
  gameDocRef: DocumentReference,
  gameData: LobbyState
): Promise<boolean> {
  if (gameData.players.length < 2) {
    return false;
  }

  // Deal cards to players
  const hands = dealCards(gameData.players.length);
  const totalRounds = hands[0].length;

  // Create TTL timestamp - 2 hours from now
  const ttlTimestamp = Timestamp.fromDate(
    new Date(Date.now() + 2 * 60 * 60 * 1000)
  );

  // Update the existing document to convert from lobby to active game
  const updatedGameState = {
    phase: "drafting",
    players: gameData.players.map((player, index) => ({
      ...player,
      draftedCards: [],
      hand: hands[index],
    })),
    deck: [...chemistryElements], // chemistry elements array
    currentRound: 1,
    totalRounds,
    wordSpellingWinners: [],
    ttl: ttlTimestamp, // Firestore TTL field - auto-delete after 2 hours
  };

  // Update the existing document instead of creating a new one and deleting the old one
  await updateDoc(gameDocRef, updatedGameState);

  return true;
}

// Submit draft selection
export async function submitDraftSelection(
  gameDocRef: DocumentReference,
  gameData: GameState,
  playerId: string,
  cardIndex: number
): Promise<boolean> {

  const playerIndex = gameData.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) {
    return false;
  }

  const player = gameData.players[playerIndex];
  if (cardIndex < 0 || cardIndex >= player.hand.length) {
    return false;
  }

  // Move card from hand to drafted cards
  const selectedCard = player.hand[cardIndex];
  const newHand = player.hand.filter((_, index) => index !== cardIndex);
  const newDraftedCards = [...player.draftedCards, selectedCard];

  // Update player
  const updatedPlayers = [...gameData.players];
  updatedPlayers[playerIndex] = {
    ...player,
    hand: newHand,
    draftedCards: newDraftedCards,
  };

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

  await updateDoc(gameDocRef, updatedGameData);
  return true;
}

// Check for word spelling and update winners
export async function checkWordSpelling(
  gameDocRef: DocumentReference,
  gameData: GameState,
  playerId: string,
  word: string
): Promise<boolean> {
  // Validate word length and format
  if (!word || word.length !== 5 || !/^[A-Za-z]+$/.test(word)) {
    throw new Error(
      "Word must be exactly 5 letters and contain only alphabetic characters"
    );
  }

  const player = gameData.players.find((p) => p.id === playerId);
  if (!player) {
    return false;
  }

  // Check if player already won word spelling
  if (
    gameData.wordSpellingWinners.some((winner) => winner.playerId === playerId)
  ) {
    return false;
  }

  // Check if word can be spelled with player's atomic symbols
  if (word.length !== 5) {
    return false;
  }

  // Only allow using cards that have been revealed (drafted in previous rounds)
  // Cards drafted in the current round are not yet revealed to everyone
  const revealedCards = player.draftedCards.slice(0, gameData.currentRound - 1);

  // Check if the player can spell this word with their revealed cards only
  if (!canSpellWord(revealedCards, word)) {
    return false;
  }

  // Add player to winners list with current round
  const updatedWinners = [
    ...gameData.wordSpellingWinners,
    { playerId, round: gameData.currentRound },
  ];
  await updateDoc(gameDocRef, {
    wordSpellingWinners: updatedWinners,
  });

  return true;
}
