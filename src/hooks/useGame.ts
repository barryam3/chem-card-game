import { useReducer, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { GameState as FirebaseGameState, LobbyState } from '../types';

const GAMES_COLLECTION = "games";
const LOBBIES_COLLECTION = "lobbies";

export interface GameData {
  id: string;
  phase: 'lobby' | 'drafting' | 'scoring' | 'finished';
  players: Array<{
    id: string;
    name: string;
    isHost: boolean;
    draftedCards?: number[];
    hand?: number[];
    score?: number;
  }>;
  hostId: string;
  createdAt: number;
  // Game-specific fields (only present when phase !== 'lobby')
  currentRound?: number;
  totalRounds?: number;
  deck?: number[];
  wordSpellingWinners?: Array<{ playerId: string; round: number }>;
}

export interface UseGameResult {
  game: GameData | null;
  loading: boolean;
  error: string | null;
}

interface HookState {
  game: GameData | null;
  loading: boolean;
  error: string | null;
}

type GameAction = 
  | { type: 'RESET' }
  | { type: 'START_LOADING' }
  | { type: 'SET_GAME'; payload: GameData }
  | { type: 'SET_ERROR'; payload: string };

function gameReducer(state: HookState, action: GameAction): HookState {
  switch (action.type) {
    case 'RESET':
      return { game: null, loading: false, error: null };
    case 'START_LOADING':
      return { ...state, loading: true, error: null };
    case 'SET_GAME':
      return { game: action.payload, loading: false, error: null };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

export function useGame(gameId: string | null): UseGameResult {
  const [state, dispatch] = useReducer(gameReducer, {
    game: null,
    loading: !!gameId,
    error: null,
  });

  useEffect(() => {
    if (!gameId) {
      dispatch({ type: 'RESET' });
      return;
    }

    dispatch({ type: 'START_LOADING' });

    // First, try to find an active game
    const gamesQuery = query(
      collection(db, GAMES_COLLECTION),
      where("id", "==", gameId)
    );

    const gameUnsubscribe = onSnapshot(
      gamesQuery,
      (querySnapshot) => {
        if (!querySnapshot.empty) {
          // Found an active game
          const gameData = querySnapshot.docs[0].data() as FirebaseGameState;
          dispatch({
            type: 'SET_GAME',
            payload: {
              id: gameData.id,
              phase: gameData.phase,
              players: gameData.players,
              hostId: gameData.hostId,
              createdAt: gameData.createdAt,
              currentRound: gameData.currentRound,
              totalRounds: gameData.totalRounds,
              deck: gameData.deck?.map(card => card.atomicNumber) || [],
              wordSpellingWinners: gameData.wordSpellingWinners,
            }
          });
        } else {
          // No active game found, check for lobby
          const lobbiesQuery = query(
            collection(db, LOBBIES_COLLECTION),
            where("id", "==", gameId)
          );

          const lobbyUnsubscribe = onSnapshot(
            lobbiesQuery,
            (lobbySnapshot) => {
              if (!lobbySnapshot.empty) {
                // Found a lobby
                const lobbyData = lobbySnapshot.docs[0].data() as LobbyState;
                dispatch({
                  type: 'SET_GAME',
                  payload: {
                    id: lobbyData.id,
                    phase: 'lobby',
                    players: lobbyData.players,
                    hostId: lobbyData.hostId,
                    createdAt: lobbyData.createdAt,
                  }
                });
              } else {
                // Neither game nor lobby found
                dispatch({ type: 'SET_ERROR', payload: 'Game not found' });
              }
            },
            (err) => {
              console.error("Firebase Lobby Subscription Error:", err);
              dispatch({ type: 'SET_ERROR', payload: 'Failed to load game' });
            }
          );

          // Return lobby unsubscribe function
          return lobbyUnsubscribe;
        }
      },
      (err) => {
        console.error("Firebase Game Subscription Error:", err);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load game' });
      }
    );

    // Cleanup function
    return () => {
      gameUnsubscribe();
    };
  }, [gameId]);

  return { game: state.game, loading: state.loading, error: state.error };
}
