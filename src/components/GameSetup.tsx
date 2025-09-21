import { useState, useEffect } from 'react';
import { createLobby, joinLobby } from '../firebaseService';
import { getGameIdFromUrl, setGameIdInUrl, setPlayerIdInUrl } from '../utils/urlUtils';
import './GameSetup.scss';

interface GameSetupProps {
  onJoinLobby: (gameId: string, playerId: string, isHost: boolean, playerName: string) => void;
}

export const GameSetup: React.FC<GameSetupProps> = ({ onJoinLobby }) => {
  const [gameId, setGameId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Auto-populate game ID from URL
    const urlGameId = getGameIdFromUrl();
    if (urlGameId) {
      setGameId(urlGameId);
    }
  }, []);

  const handleCreateGame = async () => {
    setIsCreating(true);
    setError('');

    try {
      const { gameId, playerId } = await createLobby();
      setGameIdInUrl(gameId);
      setPlayerIdInUrl(playerId);
      onJoinLobby(gameId, playerId, true, 'Player 1');
    } catch {
      setError('Failed to create game. Please try again.');
      setIsCreating(false);
    }
  };

  const handleJoinGame = async () => {
    if (!gameId.trim()) {
      setError('Please enter a game ID');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const result = await joinLobby(gameId.trim().toUpperCase());
      if (result.success && result.playerId) {
        setGameIdInUrl(gameId.trim().toUpperCase());
        setPlayerIdInUrl(result.playerId);
        // We'll get the actual player name from the lobby state
        onJoinLobby(gameId.trim().toUpperCase(), result.playerId, false, '');
      } else {
        setError('Game not found. Please check the game ID.');
        setIsJoining(false);
      }
    } catch {
      setError('Failed to join game. Please try again.');
      setIsJoining(false);
    }
  };

  return (
    <div className="game-setup">
      <div className="setup-header">
        <h1>Chemistry Card Game</h1>
        <p>Create a new game or join an existing one</p>
      </div>

      <div className="setup-form">
        <div className="setup-actions">
          <div className="create-section">
            <h3>Start New Game</h3>
            <button 
              type="button"
              onClick={handleCreateGame}
              disabled={isCreating || isJoining}
              className="create-btn"
            >
              {isCreating ? 'Creating...' : 'Create Game'}
            </button>
          </div>

          <div className="join-section">
            <h3>Join Existing Game</h3>
            <div className="input-group">
              <label htmlFor="gameId">Game ID:</label>
              <input
                id="gameId"
                type="text"
                value={gameId}
                onChange={(e) => setGameId(e.target.value.toUpperCase())}
                placeholder="Enter game ID"
                maxLength={6}
              />
            </div>
            <button 
              type="button"
              onClick={handleJoinGame}
              disabled={isCreating || isJoining}
              className="join-btn"
            >
              {isJoining ? 'Joining...' : 'Join Game'}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
