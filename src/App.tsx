import { useState, useEffect } from 'react';
import { GameSetup } from './components/GameSetup';
import { Lobby } from './components/Lobby';
import { DraftingPhase } from './components/DraftingPhase';
import { ScoringPhase } from './components/ScoringPhase';
import { useGame } from './hooks/useGame';
import { getGameIdFromUrl, getPlayerIdFromUrl, clearUrlParams } from './utils/urlUtils';
import { saveGameState, clearGameState } from './utils/storageUtils';
import { getElementByAtomicNumber } from './data';
import './App.scss';


function App() {
  // Initialize state from URL on first render
  const [gameId, setGameId] = useState(() => {
    const urlGameId = getGameIdFromUrl();
    return urlGameId || '';
  });
  
  const [playerId, setPlayerId] = useState(() => {
    const urlPlayerId = getPlayerIdFromUrl();
    return urlPlayerId || '';
  });
  
  const [isRestoring, setIsRestoring] = useState(false);
  
  // Only use the useGame hook when we have both gameId and playerId
  // If we only have gameId, we should show GameSetup with gameId pre-populated
  const shouldSubscribeToGame = gameId && playerId;
  const { game, loading: gameLoading, error: gameError } = useGame(shouldSubscribeToGame ? gameId : null);

  // Derive player info from game data (no local state needed)
  const currentPlayer = game && playerId ? game.players.find(p => p.id === playerId) : null;
  const isHost = currentPlayer?.isHost ?? false;
  const playerName = currentPlayer?.name ?? 'Player';

  // Handle game finished state
  useEffect(() => {
    if (game && game.phase === 'finished') {
      // Let the user see the results, then clear after a delay
      const timer = setTimeout(() => {
        clearGameState();
        clearUrlParams();
        setGameId('');
        setPlayerId('');
      }, 30000); // 30 seconds to view results
      
      return () => clearTimeout(timer);
    }
  }, [game]);

  const handleJoinLobby = (newGameId: string, newPlayerId: string, newIsHost: boolean, newPlayerName: string) => {
    setGameId(newGameId);
    setPlayerId(newPlayerId);
    setIsRestoring(false);
    
    // Save game state
    saveGameState({
      gameId: newGameId,
      playerId: newPlayerId,
      isHost: newIsHost,
      playerName: newPlayerName
    });
  };

  const handleGameStart = () => {
    // Game start is handled automatically by the useGame hook
    // when the game phase changes from 'lobby' to 'drafting'
  };

  const handlePlayerNameChange = (newName: string) => {
    // Player name changes are handled by the Lobby component
    // and automatically reflected through the useGame hook
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
    if (isRestoring || gameLoading) {
      return <div className="loading">Loading...</div>;
    }

    if (gameError) {
      return <div className="error">Error: {gameError}</div>;
    }

    // If we don't have a gameId, or we have gameId but no playerId, show setup
    if (!gameId || !playerId) {
      return <GameSetup onJoinLobby={handleJoinLobby} />;
    }

    // If we have both gameId and playerId but no game data yet, show loading
    if (!game) {
      return <div className="loading">Loading game...</div>;
    }

    // Render based on game phase
    switch (game.phase) {
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
      
      case 'drafting': {
        // Convert game data to GameState format for existing components
        const gameState = {
          ...game,
          players: game.players.map(p => ({
            ...p,
            draftedCards: p.draftedCards || [],
            hand: p.hand || [],
          })),
          currentRound: game.currentRound || 1,
          totalRounds: game.totalRounds || 1,
          deck: (game.deck || []).map(atomicNumber => getElementByAtomicNumber(atomicNumber)), // Convert numbers to full ChemistryElement objects
          wordSpellingWinners: game.wordSpellingWinners || [],
        };
        
        return (
          <DraftingPhase
            game={gameState}
            currentPlayerId={playerId}
          />
        );
      }
      
      case 'scoring':
      case 'finished': {
        const scoringGameState = {
          ...game,
          players: game.players.map(p => ({
            ...p,
            draftedCards: p.draftedCards || [],
            hand: p.hand || [],
          })),
          currentRound: game.currentRound || 1,
          totalRounds: game.totalRounds || 1,
          deck: (game.deck || []).map(atomicNumber => getElementByAtomicNumber(atomicNumber)), // Convert numbers to full ChemistryElement objects
          wordSpellingWinners: game.wordSpellingWinners || [],
        };
        
        return (
          <ScoringPhase
            game={scoringGameState}
            currentPlayerId={playerId}
          />
        );
      }
      
      default:
        return <div>Unknown game phase: {game.phase}</div>;
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
