import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where
} from 'firebase/firestore';
import { db } from './firebase';
import type { GameState, LobbyState, Player } from './types';
import { gameData } from './data';
import { dealCards, generateGameId, canSpellWord } from './gameLogic';

const GAMES_COLLECTION = 'games';
const LOBBIES_COLLECTION = 'lobbies';

// Create a new game lobby
export async function createLobby(): Promise<{ gameId: string; playerId: string }> {
  const gameId = generateGameId();
  const hostId = Math.random().toString(36).substring(2, 15);
  
  const lobbyData: LobbyState = {
    id: gameId,
    players: [{
      id: hostId,
      name: 'Player 1',
      isHost: true
    }],
    hostId,
    createdAt: Date.now()
  };
  
  await addDoc(collection(db, LOBBIES_COLLECTION), lobbyData);
  return { gameId, playerId: hostId };
}

// Join an existing lobby
export async function joinLobby(gameId: string): Promise<{ success: boolean; playerId?: string }> {
  const lobbiesQuery = query(
    collection(db, LOBBIES_COLLECTION),
    where('id', '==', gameId)
  );
  
  const querySnapshot = await getDocs(lobbiesQuery);
  
  if (querySnapshot.empty) {
    return { success: false };
  }
  
  const lobbyDoc = querySnapshot.docs[0];
  const lobbyData = lobbyDoc.data() as LobbyState;
  
  const playerId = Math.random().toString(36).substring(2, 15);
  const playerNumber = lobbyData.players.length + 1;
  const newPlayer: Omit<Player, 'draftedCards' | 'hand' | 'score'> = {
    id: playerId,
    name: `Player ${playerNumber}`,
    isHost: false
  };
  
  await updateDoc(lobbyDoc.ref, {
    players: [...lobbyData.players, newPlayer]
  });
  
  return { success: true, playerId };
}

// Update player name in lobby
export async function updatePlayerName(gameId: string, playerId: string, newName: string): Promise<boolean> {
  const lobbiesQuery = query(
    collection(db, LOBBIES_COLLECTION),
    where('id', '==', gameId)
  );
  
  const querySnapshot = await getDocs(lobbiesQuery);
  
  if (querySnapshot.empty) {
    return false;
  }
  
  const lobbyDoc = querySnapshot.docs[0];
  const lobbyData = lobbyDoc.data() as LobbyState;
  
  const playerIndex = lobbyData.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return false;
  }
  
  // Update the player's name
  const updatedPlayers = [...lobbyData.players];
  updatedPlayers[playerIndex] = {
    ...updatedPlayers[playerIndex],
    name: newName
  };
  
  await updateDoc(lobbyDoc.ref, {
    players: updatedPlayers
  });
  
  return true;
}

// Start the game (convert lobby to game)
export async function startGame(gameId: string): Promise<boolean> {
  const lobbiesQuery = query(
    collection(db, LOBBIES_COLLECTION),
    where('id', '==', gameId)
  );
  
  const querySnapshot = await getDocs(lobbiesQuery);
  
  if (querySnapshot.empty) {
    return false;
  }
  
  const lobbyDoc = querySnapshot.docs[0];
  const lobbyData = lobbyDoc.data() as LobbyState;
  
  if (lobbyData.players.length < 2) {
    return false;
  }
  
  // Deal cards to players
  const hands = dealCards(lobbyData.players.length);
  const totalRounds = hands[0].length;
  
  // Create game state
  const gameState: GameState = {
    id: gameId,
    phase: 'drafting',
    players: lobbyData.players.map((player, index) => ({
      ...player,
      draftedCards: [],
      hand: hands[index]
    })),
    deck: [...gameData],
    currentRound: 1,
    totalRounds,
    wordSpellingWinners: [],
    createdAt: Date.now(),
    hostId: lobbyData.hostId
  };
  
  // Add game to games collection
  await addDoc(collection(db, GAMES_COLLECTION), gameState);
  
  // Remove lobby
  await deleteDoc(lobbyDoc.ref);
  
  return true;
}

// Get lobby state
export function subscribeToLobby(gameId: string, callback: (lobby: LobbyState | null) => void) {
  const lobbiesQuery = query(
    collection(db, LOBBIES_COLLECTION),
    where('id', '==', gameId)
  );
  
  return onSnapshot(lobbiesQuery, (querySnapshot) => {
    if (querySnapshot.empty) {
      callback(null);
      return;
    }
    
    const lobbyData = querySnapshot.docs[0].data() as LobbyState;
    callback(lobbyData);
  });
}

// Get game state
export function subscribeToGame(gameId: string, callback: (game: GameState | null) => void) {
  const gamesQuery = query(
    collection(db, GAMES_COLLECTION),
    where('id', '==', gameId)
  );
  
  return onSnapshot(gamesQuery, (querySnapshot) => {
    if (querySnapshot.empty) {
      callback(null);
      return;
    }
    
    const gameData = querySnapshot.docs[0].data() as GameState;
    callback(gameData);
  });
}

// Submit draft selection
export async function submitDraftSelection(gameId: string, playerId: string, cardIndex: number): Promise<boolean> {
  const gamesQuery = query(
    collection(db, GAMES_COLLECTION),
    where('id', '==', gameId)
  );
  
  const querySnapshot = await getDocs(gamesQuery);
  
  if (querySnapshot.empty) {
    return false;
  }
  
  const gameDoc = querySnapshot.docs[0];
  const gameData = gameDoc.data() as GameState;
  
  const playerIndex = gameData.players.findIndex(p => p.id === playerId);
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
    draftedCards: newDraftedCards
  };
  
  // Check if all players have made their selection
  // All players should have the same hand length (one less than they started with this round)
  // We need to check if all players have exactly one less card than they started with
  // Find the maximum hand length among all players (this represents the round start hand length)
  const maxHandLength = Math.max(...updatedPlayers.map(p => p.hand.length));
  const minHandLength = Math.min(...updatedPlayers.map(p => p.hand.length));
  
  // All players have selected if they all have the same hand length
  // This includes the case where all hands are empty (maxHandLength === minHandLength === 0)
  const allPlayersSelected = maxHandLength === minHandLength;
  
  console.log('Draft selection debug:', {
    maxHandLength,
    minHandLength,
    playerHandLengths: updatedPlayers.map(p => ({ id: p.id, handLength: p.hand.length, draftedCount: p.draftedCards.length })),
    allPlayersSelected,
    allHandsEmpty: updatedPlayers.every(p => p.hand.length === 0)
  });
  
  let updatedGameData = {
    ...gameData,
    players: updatedPlayers
  };
  
  if (allPlayersSelected) {
    // Check if ALL players have empty hands (drafting complete)
    const allHandsEmpty = updatedPlayers.every(p => p.hand.length === 0);
    
    if (allHandsEmpty) {
      // End drafting phase
      console.log('All players have empty hands, moving to scoring phase');
      updatedGameData = {
        ...updatedGameData,
        phase: 'scoring' as const
      };
    } else {
      // Pass hands to the next player (drafting mechanic)
      console.log('All players selected, passing hands and moving to next round');
      
      // Create array of current hands
      const currentHands = updatedPlayers.map(p => p.hand);
      
      // Pass hands to the left (each player gets the hand from the player to their right)
      const passedPlayers = updatedPlayers.map((player, index) => {
        const nextPlayerIndex = (index + 1) % updatedPlayers.length;
        return {
          ...player,
          hand: currentHands[nextPlayerIndex]
        };
      });
      
      updatedGameData = {
        ...updatedGameData,
        players: passedPlayers,
        currentRound: gameData.currentRound + 1
      };
      
      console.log('Hands passed:', {
        round: gameData.currentRound + 1,
        handLengths: passedPlayers.map(p => ({ id: p.id, handLength: p.hand.length }))
      });
    }
  }
  
  await updateDoc(gameDoc.ref, updatedGameData);
  return true;
}

// Check for word spelling and update winners
export async function checkWordSpelling(gameId: string, playerId: string, word: string): Promise<boolean> {
  const gamesQuery = query(
    collection(db, GAMES_COLLECTION),
    where('id', '==', gameId)
  );
  
  const querySnapshot = await getDocs(gamesQuery);
  
  if (querySnapshot.empty) {
    return false;
  }
  
  const gameDoc = querySnapshot.docs[0];
  const gameData = gameDoc.data() as GameState;
  
  const player = gameData.players.find(p => p.id === playerId);
  if (!player) {
    return false;
  }
  
  // Check if player already won word spelling
  if (gameData.wordSpellingWinners.some(winner => winner.playerId === playerId)) {
    return false;
  }
  
  // Check if word can be spelled with player's atomic symbols
  if (word.length !== 5) {
    return false;
  }
  
  // Only allow using cards that have been revealed (drafted in previous rounds)
  // Cards drafted in the current round are not yet revealed to everyone
  const revealedCards = player.draftedCards.slice(0, gameData.currentRound - 1);
  
  console.log('Word spelling check:', {
    currentRound: gameData.currentRound,
    totalDrafted: player.draftedCards.length,
    revealedCards: revealedCards.length,
    canUseForSpelling: revealedCards.map(c => c.atomicSymbol)
  });
  
  // Check if the player can spell this word with their revealed cards only
  if (!canSpellWord(revealedCards, word)) {
    return false;
  }
  
  // Add player to winners list with current round
  const updatedWinners = [...gameData.wordSpellingWinners, { playerId, round: gameData.currentRound }];
  await updateDoc(gameDoc.ref, {
    wordSpellingWinners: updatedWinners
  });
  
  return true;
}
