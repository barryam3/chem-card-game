import { useState, useEffect } from 'react';
import type { GameState, GameScore } from '../types';
import { Card } from './Card';
import { calculateTotalScore, calculateWordSpellingPoints, getDeckConfig } from '../gameLogic';

interface ScoringPhaseProps {
  game: GameState;
  currentPlayerId: string;
}

export const ScoringPhase: React.FC<ScoringPhaseProps> = ({ game, currentPlayerId }) => {
  const [scores, setScores] = useState<{ [playerId: string]: GameScore }>({});
  
  // Determine if radioactivity scoring should be shown (only for 7+ players with 103-card deck)
  const { deckSize } = getDeckConfig(game.players.length);
  const showRadioactivity = deckSize === 103;

  useEffect(() => {
    // Calculate scores for all players
    const calculatedScores: { [playerId: string]: GameScore } = {};
    
    game.players.forEach((player, index) => {
      const leftNeighbor = game.players[index === 0 ? game.players.length - 1 : index - 1];
      const rightNeighbor = game.players[index === game.players.length - 1 ? 0 : index + 1];
      
      // Calculate word spelling bonus for this player using the new logic
      const wordSpellingBonus = calculateWordSpellingPoints(player.id, game.wordSpellingWinners);
      
      calculatedScores[player.id] = calculateTotalScore(
        player.draftedCards,
        leftNeighbor.draftedCards,
        rightNeighbor.draftedCards,
        wordSpellingBonus,
        showRadioactivity
      );
    });
    
    setScores(calculatedScores);
  }, [game, showRadioactivity]);


  const sortedPlayers = [...game.players].sort((a, b) => {
    const scoreA = scores[a.id]?.total || 0;
    const scoreB = scores[b.id]?.total || 0;
    
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    
    // Tiebreaker: highest atomic number
    const maxAtomicA = Math.max(...a.draftedCards.map(c => c.atomicNumber), 0);
    const maxAtomicB = Math.max(...b.draftedCards.map(c => c.atomicNumber), 0);
    return maxAtomicB - maxAtomicA;
  });

  const currentPlayer = game.players.find(p => p.id === currentPlayerId);

  return (
    <div className="scoring-phase">
      <div className="scoring-header">
        <h2>Final Scoring</h2>
        <p>Game complete! Here are the final results:</p>
      </div>

      <div className="scoring-content">
        {game.wordSpellingWinners.length > 0 && (
          <div className="word-spelling-section">
            <h3>Word Spelling Winners</h3>
            <div className="word-winners">
              {(() => {
                // Group winners by round and assign points correctly
                const winnersByRound = game.wordSpellingWinners.reduce((acc, winner) => {
                  if (!acc[winner.round]) acc[winner.round] = [];
                  acc[winner.round].push(winner);
                  return acc;
                }, {} as Record<number, typeof game.wordSpellingWinners>);
                
                const sortedRounds = Object.keys(winnersByRound).map(Number).sort((a, b) => a - b);
                const pointValues = [8, 5, 2];
                let currentPointIndex = 0;
                
                return sortedRounds.flatMap(round => {
                  const roundWinners = winnersByRound[round];
                  const points = pointValues[currentPointIndex] || 0;
                  currentPointIndex += roundWinners.length; // Skip next places if multiple winners
                  
                  return roundWinners.map(winner => {
                    const player = game.players.find(p => p.id === winner.playerId);
                    return (
                      <div key={winner.playerId} className="word-winner">
                        {player?.name}: {points} points (Round {round})
                      </div>
                    );
                  });
                });
              })()}
            </div>
          </div>
        )}

        <div className="final-scores">
          <h3>Final Scores</h3>
          <div className="scoreboard">
            {sortedPlayers.map((player, index) => {
              const playerScore = scores[player.id];
              const isCurrentPlayer = player.id === currentPlayerId;
              
              return (
                <div key={player.id} className={`score-entry ${isCurrentPlayer ? 'current-player' : ''}`}>
                  <div className="rank">#{index + 1}</div>
                  <div className="player-info">
                    <div className="player-name">
                      {player.name} {isCurrentPlayer && '(You)'}
                    </div>
                    <div className="total-score">Total: {playerScore?.total || 0} points</div>
                  </div>
                  
                  {playerScore && (
                    <div className="score-breakdown">
                      <div className="score-item">
                        <span>Atomic Number:</span> <span>{playerScore.atomicNumber}</span>
                      </div>
                      <div className="score-item">
                        <span>Atomic Mass:</span> <span>{playerScore.atomicMass}</span>
                      </div>
                      <div className="score-item">
                        <span>Atomic Symbol:</span> <span>{playerScore.atomicSymbol}</span>
                      </div>
                      {showRadioactivity && (
                        <div className="score-item">
                          <span>Radioactivity:</span> <span>{playerScore.radioactivity}</span>
                        </div>
                      )}
                      <div className="score-item">
                        <span>Ionization:</span> <span>{playerScore.ionization}</span>
                      </div>
                      <div className="score-item">
                        <span>Family:</span> <span>{playerScore.family}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="player-cards">
          <h3>Your Drafted Cards</h3>
          <div className="cards-grid">
            {currentPlayer?.draftedCards
              .sort((a, b) => a.atomicNumber - b.atomicNumber)
              .map((element, index) => (
                <Card
                  key={`final-${element.atomicNumber}-${index}`}
                  element={element}
                  showDetails={true}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
