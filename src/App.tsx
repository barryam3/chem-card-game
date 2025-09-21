import { useState, useEffect } from 'react';
import { GameSetup } from './components/GameSetup';
import { Lobby } from './components/Lobby';
import { DraftingPhase } from './components/DraftingPhase';
import { ScoringPhase } from './components/ScoringPhase';
import type { GameState } from './types';
import { subscribeToGame, subscribeToLobby, cleanupOldGames } from './firebaseService';
import { getGameIdFromUrl, getPlayerIdFromUrl, clearUrlParams } from './utils/urlUtils';
import { saveGameState, clearGameState } from './utils/storageUtils';
import './App.scss';

type AppState = 'setup' | 'lobby' | 'game';

function App() {
  const [appState, setAppState] = useState<AppState>('setup');
  const [gameId, setGameId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [game, setGame] = useState<GameState | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Set up periodic cleanup of old games (every 30 minutes)
  useEffect(() => {
    // Run cleanup immediately on app load
    cleanupOldGames();
    
    // Set up interval for periodic cleanup
    const cleanupInterval = setInterval(() => {
      cleanupOldGames();
    }, 30 * 60 * 1000); // 30 minutes
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // Restore game state from URL or localStorage on app load
  useEffect(() => {
    const restoreGameState = async () => {
      const urlGameId = getGameIdFromUrl();
      const urlPlayerId = getPlayerIdFromUrl();
      
      if (urlGameId && urlPlayerId) {
        // URL has both game ID and player ID - try to restore
        setGameId(urlGameId);
        setPlayerId(urlPlayerId);
        
        // Try to find the game first
        const gameUnsubscribe = subscribeToGame(urlGameId, (gameData) => {
          if (gameData) {
            setGame(gameData);
            setAppState('game');
            setIsHost(gameData.hostId === urlPlayerId);
            setIsRestoring(false);
          } else {
            // Game not found, try lobby
            const lobbyUnsubscribe = subscribeToLobby(urlGameId, (lobbyData) => {
              if (lobbyData) {
                const player = lobbyData.players.find(p => p.id === urlPlayerId);
                if (player) {
                  setAppState('lobby');
                  setIsHost(player.isHost);
                  setPlayerName(player.name);
                  setIsRestoring(false);
                } else {
                  // Player not found in lobby
                  setAppState('setup');
                  setIsRestoring(false);
                }
              } else {
                // Neither game nor lobby found
                setAppState('setup');
                setIsRestoring(false);
              }
            });
            return lobbyUnsubscribe;
          }
        });
        return gameUnsubscribe;
      } else if (urlGameId && !urlPlayerId) {
        // URL has only game ID - go to setup screen with game ID pre-populated
        setGameId(urlGameId);
        setAppState('setup');
        setIsRestoring(false);
      } else {
        // No URL parameters - start fresh
        setIsRestoring(false);
      }
    };

    restoreGameState();
  }, []);

  useEffect(() => {
    if (gameId && appState === 'game') {
      const unsubscribe = subscribeToGame(gameId, (gameData) => {
        if (gameData) {
          setGame(gameData);
          
          // Check if game has ended
          if (gameData.phase === 'finished') {
            // Game is complete, could show final results or redirect
          }
        } else {
          // Game not found, might have been deleted
          setAppState('setup');
          clearGameState();
          clearUrlParams();
        }
      });
      
      return unsubscribe;
    }
  }, [gameId, appState]);

  // Handle lobby-to-game transition
  useEffect(() => {
    if (gameId && playerId && appState === 'lobby') {
      const unsubscribe = subscribeToLobby(gameId, (lobbyData) => {
        if (!lobbyData) {
          // Lobby disappeared, check if game started
          const gameUnsubscribe = subscribeToGame(gameId, (gameData) => {
            if (gameData) {
              // Game has started, transition to game
              setGame(gameData);
              setAppState('game');
              setIsHost(gameData.hostId === playerId);
            } else {
              // Neither lobby nor game found, go back to setup
              setAppState('setup');
              clearGameState();
              clearUrlParams();
            }
          });
          return gameUnsubscribe;
        }
      });
      
      return unsubscribe;
    }
  }, [gameId, playerId, appState]);

  const handleJoinLobby = (newGameId: string, newPlayerId: string, newIsHost: boolean, newPlayerName: string) => {
    setGameId(newGameId);
    setPlayerId(newPlayerId);
    setIsHost(newIsHost);
    setPlayerName(newPlayerName);
    setAppState('lobby');
    
    // Save game state
    saveGameState({
      gameId: newGameId,
      playerId: newPlayerId,
      isHost: newIsHost,
      playerName: newPlayerName
    });
  };

  const handleGameStart = () => {
    setAppState('game');
  };

  const handlePlayerNameChange = (newName: string) => {
    setPlayerName(newName);
    // Update stored game state
    if (gameId && playerId) {
      saveGameState({
        gameId,
        playerId,
        isHost,
        playerName: newName
      });
    }
  };

  const renderCurrentView = () => {
    if (isRestoring) {
      return <div className="loading">Restoring game...</div>;
    }

    switch (appState) {
      case 'setup':
        return <GameSetup onJoinLobby={handleJoinLobby} />;
      
      case 'lobby':
        return (
          <Lobby
            gameId={gameId}
            playerId={playerId}
            isHost={isHost}
            playerName={playerName}
            onGameStart={handleGameStart}
            onPlayerNameChange={handlePlayerNameChange}
          />
        );
      
      case 'game':
        if (!game) {
          return <div className="loading">Loading game...</div>;
        }
        
        switch (game.phase) {
          case 'drafting':
            return (
              <DraftingPhase
                game={game}
                currentPlayerId={playerId}
              />
            );
          
          case 'scoring':
            return (
              <ScoringPhase
                game={game}
                currentPlayerId={playerId}
              />
            );
          
          case 'finished':
            return (
              <div className="game-finished">
                <h2>Game Finished!</h2>
                <p>Thank you for playing Chemistry Card Game!</p>
                <button type="button" onClick={() => setAppState('setup')}>
                  Play Again
                </button>
              </div>
            );
          
          default:
            return <div>Unknown game phase</div>;
        }
      
      default:
        return <div>Unknown app state</div>;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Chemistry Card Game</h1>
      </header>
      
      <main className="app-main">
        {renderCurrentView()}
      </main>
    </div>
  );
}

export default App;
