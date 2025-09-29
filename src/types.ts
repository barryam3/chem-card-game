import type { Timestamp } from "firebase/firestore";

export type GamePhase = "lobby" | "drafting" | "scoring" | "finished";

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  draftedCards: number[]; // Store atomic numbers only
  hand: number[]; // Store atomic numbers only
  score?: number;
}

export interface WordSpellingWinner {
  playerId: string;
  round: number;
}

export interface GameState {
  id: string;
  phase: GamePhase;
  players: Player[];
  currentRound: number;
  totalRounds: number;
  wordSpellingWinners: WordSpellingWinner[]; // Players who have spelled 5-letter words with round info
  expireAt: Timestamp;
  hostId: string;
}

export interface LobbyState {
  id: string;
  players: Omit<Player, "draftedCards" | "hand" | "score">[];
  hostId: string;
  expireAt: Timestamp;
}

export interface DraftSelection {
  playerId: string;
  cardIndex: number;
  timestamp: number;
}

export interface GameScore {
  atomicNumber: number;
  atomicMass: number;
  atomicSymbol: number;
  radioactivity: number;
  ionization: number;
  sameFamily: number;
  differentFamilies: number;
  total: number;
}
