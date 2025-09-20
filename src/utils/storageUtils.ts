// Local storage utilities for game state persistence

const PLAYER_NAME_KEY = 'chem-card-game-player-name';
const GAME_STATE_KEY = 'chem-card-game-state';

export interface StoredGameState {
  gameId: string;
  playerId: string;
  isHost: boolean;
  playerName: string;
}

export function savePlayerName(playerName: string): void {
  localStorage.setItem(PLAYER_NAME_KEY, playerName);
}

export function getPlayerName(): string | null {
  return localStorage.getItem(PLAYER_NAME_KEY);
}

export function saveGameState(gameState: StoredGameState): void {
  localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState));
}

export function getGameState(): StoredGameState | null {
  const stored = localStorage.getItem(GAME_STATE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearGameState(): void {
  localStorage.removeItem(GAME_STATE_KEY);
}

export function generateDefaultPlayerName(playerIndex: number): string {
  return `Player ${playerIndex + 1}`;
}
