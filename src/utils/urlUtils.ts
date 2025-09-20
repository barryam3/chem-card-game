// URL utility functions for game state persistence

export function getGameIdFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('gameId');
}

export function getPlayerIdFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('playerId');
}

export function setGameIdInUrl(gameId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('gameId', gameId);
  window.history.replaceState({}, '', url.toString());
}

export function setPlayerIdInUrl(playerId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('playerId', playerId);
  window.history.replaceState({}, '', url.toString());
}

export function getGameUrl(gameId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('gameId', gameId);
  url.searchParams.delete('playerId'); // Remove player ID from shareable URL
  return url.toString();
}

export function getPlayerUrl(gameId: string, playerId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('gameId', gameId);
  url.searchParams.set('playerId', playerId);
  return url.toString();
}

export function clearUrlParams(): void {
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState({}, '', url.toString());
}
