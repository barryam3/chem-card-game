import { useReducer, useEffect } from "react";
import { collection, query, where, onSnapshot, DocumentReference } from "firebase/firestore";
import { db } from "../firebase";
import type { GameState as FirebaseGameState, LobbyState } from "../types";

const GAMES_COLLECTION = "games";

export interface GameData {
  id: string;
  phase: "lobby" | "drafting" | "scoring" | "finished";
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
  gameDocRef: DocumentReference | null;
  loading: boolean;
  error: string | null;
}

interface HookState {
  game: GameData | null;
  gameDocRef: DocumentReference | null;
  loading: boolean;
  error: string | null;
}

type GameAction =
  | { type: "RESET" }
  | { type: "START_LOADING" }
  | { type: "SET_GAME"; payload: { game: GameData; docRef: DocumentReference } }
  | { type: "SET_ERROR"; payload: string };

function gameReducer(state: HookState, action: GameAction): HookState {
  switch (action.type) {
    case "RESET":
      return { game: null, gameDocRef: null, loading: false, error: null };
    case "START_LOADING":
      return { ...state, loading: true, error: null };
    case "SET_GAME":
      return { 
        game: action.payload.game, 
        gameDocRef: action.payload.docRef, 
        loading: false, 
        error: null 
      };
    case "SET_ERROR":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

export function useGame(gameId: string | null): UseGameResult {
  const [state, dispatch] = useReducer(gameReducer, {
    game: null,
    gameDocRef: null,
    loading: !!gameId,
    error: null,
  });

  useEffect(() => {
    if (!gameId) {
      dispatch({ type: "RESET" });
      return;
    }

    dispatch({ type: "START_LOADING" });

    // Query the games collection for any game with this ID (regardless of phase)
    const gamesQuery = query(
      collection(db, GAMES_COLLECTION),
      where("id", "==", gameId)
    );

    const gameUnsubscribe = onSnapshot(
      gamesQuery,
      (querySnapshot) => {
        if (querySnapshot.empty) {
          // No game found
          dispatch({ type: "SET_ERROR", payload: "Game not found" });
          return;
        }
        // Found a game (could be in lobby, drafting, scoring, or finished phase)
        const gameDoc = querySnapshot.docs[0];
        const gameData = gameDoc.data();

         // Handle both lobby-style and full game data
         if (gameData.phase === "lobby") {
           // This is a lobby (LobbyState structure)
           const lobbyData = gameData as LobbyState;
           dispatch({
             type: "SET_GAME",
             payload: {
               game: {
                 id: lobbyData.id,
                 phase: "lobby",
                 players: lobbyData.players,
                 hostId: lobbyData.hostId,
                 createdAt: lobbyData.createdAt,
               },
               docRef: gameDoc.ref,
             },
           });
         } else {
           // This is an active game (GameState structure)
           const fullGameData = gameData as FirebaseGameState;
           dispatch({
             type: "SET_GAME",
             payload: {
               game: {
                 id: fullGameData.id,
                 phase: fullGameData.phase,
                 players: fullGameData.players,
                 hostId: fullGameData.hostId,
                 createdAt: fullGameData.createdAt,
                 currentRound: fullGameData.currentRound,
                 totalRounds: fullGameData.totalRounds,
                 deck: fullGameData.deck?.map((card) => card.atomicNumber) || [],
                 wordSpellingWinners: fullGameData.wordSpellingWinners,
               },
               docRef: gameDoc.ref,
             },
           });
         }
      },
      (err) => {
        console.error("Firebase Game Subscription Error:", err);
        dispatch({ type: "SET_ERROR", payload: "Failed to load game" });
      }
    );

    // Cleanup function
    return () => {
      gameUnsubscribe();
    };
  }, [gameId]);

  return state;
}
