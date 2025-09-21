import { useState, useEffect } from "react";
import type { GameState } from "../types";
import { Card } from "./Card";
import { submitDraftSelection, checkWordSpelling } from "../firebaseService";
import './DraftingPhase.scss';

interface DraftingPhaseProps {
	game: GameState;
	currentPlayerId: string;
}

export const DraftingPhase: React.FC<DraftingPhaseProps> = ({
	game,
	currentPlayerId,
}) => {
	const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(
		null,
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [wordInput, setWordInput] = useState("");
	const [wordSubmitting, setWordSubmitting] = useState(false);
	const [wordError, setWordError] = useState("");

	const currentPlayer = game.players.find((p) => p.id === currentPlayerId);
	if (!currentPlayer) {
		return <div>Player not found</div>;
	}

	// Reset submitting state when game state changes (new round or phase change)
	useEffect(() => {
		setIsSubmitting(false);
		setSelectedCardIndex(null);
	}, [game.currentRound, game.phase]);

	// Debug logging for game state
	useEffect(() => {
		console.log("DraftingPhase game state:", {
			currentRound: game.currentRound,
			totalRounds: game.totalRounds,
			phase: game.phase,
			players: game.players.map((p) => ({
				id: p.id,
				name: p.name,
				handLength: p.hand.length,
				draftedCount: p.draftedCards.length,
			})),
		});
	}, [game]);

	const handleCardSelect = (index: number) => {
		setSelectedCardIndex(index);
	};

	const handleSubmitSelection = async () => {
		if (selectedCardIndex === null) return;

		setIsSubmitting(true);
		const success = await submitDraftSelection(
			game.id,
			currentPlayerId,
			selectedCardIndex,
		);

		if (!success) {
			alert("Failed to submit selection. Please try again.");
			setIsSubmitting(false);
		}
		// If successful, the component will re-render with updated game state
	};

	const handleWordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (wordInput.length === 5 && !wordSubmitting) {
			setWordSubmitting(true);
			setWordError("");

			try {
				const success = await checkWordSpelling(
					game.id,
					currentPlayerId,
					wordInput,
				);
				if (success) {
					setWordInput("");
					// Don't need to set any local state - the game state will update via subscription
				} else {
					setWordError(
						"Cannot spell this word with your drafted cards, or you have already submitted a word.",
					);
				}
			} catch (error) {
				setWordError("Failed to submit word. Please try again.");
				console.error("Word submission error:", error);
			} finally {
				setWordSubmitting(false);
			}
		}
	};

	// Check if all players have made their selection (same logic as in submitDraftSelection)
	const maxHandLength = Math.max(...game.players.map((p) => p.hand.length));
	const minHandLength = Math.min(...game.players.map((p) => p.hand.length));
	const allPlayersReady = maxHandLength === minHandLength;

	return (
		<div className="drafting-phase">
			<div className="drafting-header">
				<h2>Drafting Phase</h2>
				<div className="round-info">
					Round {game.currentRound} of {game.totalRounds}
				</div>
			</div>

			<div className="drafting-content">
				<div className="hand-section">
					<h3>Your Hand - Select a card to draft:</h3>
					<p className="drafting-info">
						After all players select a card, hands will be passed to the next player.
					</p>
					<div className="hand">
						{currentPlayer.hand
							.map((element, index) => ({ element, originalIndex: index }))
							.sort((a, b) => a.element.atomicNumber - b.element.atomicNumber)
							.map(({ element, originalIndex }) => (
								<Card
									key={`${element.atomicNumber}-${originalIndex}`}
									element={element}
									onClick={() => handleCardSelect(originalIndex)}
									isSelected={selectedCardIndex === originalIndex}
									isDisabled={isSubmitting}
								/>
							))}
					</div>

					{selectedCardIndex !== null && (
						<div className="selection-actions">
							<button
								type="button"
								onClick={handleSubmitSelection}
								disabled={isSubmitting}
								className="submit-selection-btn"
							>
								{isSubmitting ? "Submitting..." : "Draft This Card"}
							</button>
						</div>
					)}
				</div>

				<div className="drafted-cards-section">
					<h3>All Players' Drafted Cards:</h3>
					{game.players
						.sort((a, b) => {
							// Put current player first, then sort others by name
							if (a.id === currentPlayerId) return -1;
							if (b.id === currentPlayerId) return 1;
							return a.name.localeCompare(b.name);
						})
						.map((player) => {
							const revealedCards = player.draftedCards.slice(
								0,
								game.currentRound - 1,
							);
							const unrevealedCards = player.draftedCards.slice(
								game.currentRound - 1,
							);

							return (
								<div key={player.id} className="player-drafted-cards">
									<h4
										className={`player-name ${player.id === currentPlayerId ? "current-player" : ""}`}
									>
										{player.name} ({player.draftedCards.length} cards)
										{player.id === currentPlayerId && " (You)"}
									</h4>

									{revealedCards.length > 0 && (
										<div className="card-group">
											<h5>Revealed Cards ({revealedCards.length}):</h5>
											<div className="drafted-cards">
												{revealedCards
													.sort((a, b) => a.atomicNumber - b.atomicNumber)
													.map((element, index) => (
														<Card
															key={`${player.id}-revealed-${element.atomicNumber}-${index}`}
															element={element}
															showDetails={false}
														/>
													))}
											</div>
										</div>
									)}

									{unrevealedCards.length > 0 && (
										<div className="card-group">
											<h5>This Round's Cards ({unrevealedCards.length}):</h5>
											<div className="drafted-cards unrevealed">
												{unrevealedCards
													.sort((a, b) => a.atomicNumber - b.atomicNumber)
													.map((element, index) => (
														<Card
															key={`${player.id}-unrevealed-${element.atomicNumber}-${index}`}
															element={element}
															showDetails={false}
														/>
													))}
											</div>
										</div>
									)}

									{player.draftedCards.length === 0 && (
										<div className="no-cards">No cards drafted yet</div>
									)}
								</div>
							);
						})}
				</div>

				<div className="word-spelling-section">
					<h3>Word Spelling Bonus</h3>
					{(() => {
						const revealedCards = currentPlayer.draftedCards.slice(
							0,
							game.currentRound - 1,
						);
						const canSpellWords =
							revealedCards
								.map((c) => c.atomicSymbol.length)
								.reduce((a, b) => a + b, 0) >= 5;

						return (
							<>
								{canSpellWords &&
									game.wordSpellingWinners.length < 3 &&
									!game.wordSpellingWinners.some(
										(winner) => winner.playerId === currentPlayerId,
									) && (
										<form onSubmit={handleWordSubmit} className="word-form">
											<label htmlFor="wordInput">
												Try to spell a 5-letter word with your revealed cards:
											</label>
											<div className="word-input-group">
												<input
													id="wordInput"
													type="text"
													value={wordInput}
													onChange={(e) =>
														setWordInput(e.target.value.toUpperCase())
													}
													placeholder="Enter 5-letter word"
													maxLength={5}
													disabled={wordSubmitting}
												/>
												<button
													type="submit"
													disabled={wordInput.length !== 5 || wordSubmitting}
												>
													{wordSubmitting ? "Checking..." : "Submit Word"}
												</button>
											</div>
											{wordError && (
												<div className="word-error">{wordError}</div>
											)}
										</form>
									)}
							</>
						);
					})()}

					{game.wordSpellingWinners.some(
						(winner) => winner.playerId === currentPlayerId,
					) && (
						<div className="word-success">
							✓ You have successfully submitted a word and earned points!
						</div>
					)}

					{game.wordSpellingWinners.length >= 3 &&
						!game.wordSpellingWinners.some(
							(winner) => winner.playerId === currentPlayerId,
						) && (
							<div className="word-info">
								All word spelling spots have been taken.
							</div>
						)}

					{game.wordSpellingWinners.length > 0 && (
						<div className="word-winners">
							<h4>Word Spelling Winners:</h4>
							{(() => {
								// Group winners by round and assign points correctly
								const winnersByRound = game.wordSpellingWinners.reduce(
									(acc, winner) => {
										if (!acc[winner.round]) acc[winner.round] = [];
										acc[winner.round].push(winner);
										return acc;
									},
									{} as Record<number, typeof game.wordSpellingWinners>,
								);

								const sortedRounds = Object.keys(winnersByRound)
									.map(Number)
									.sort((a, b) => a - b);
								const pointValues = [8, 5, 2];
								let currentPointIndex = 0;

								return sortedRounds.flatMap((round) => {
									const roundWinners = winnersByRound[round];
									const points = pointValues[currentPointIndex] || 0;
									currentPointIndex += roundWinners.length; // Skip next places if multiple winners

									return roundWinners.map((winner) => {
										const player = game.players.find(
											(p) => p.id === winner.playerId,
										);
										return (
											<div key={winner.playerId} className="word-winner">
												{player?.name}: {points} points (Round {round})
											</div>
										);
									});
								});
							})()}
						</div>
					)}
				</div>

				<div className="players-status">
					<h3>Players Status:</h3>
					<div className="players-list">
						{game.players.map((player) => (
							<div key={player.id} className="player-status">
								<span className="player-name">{player.name}</span>
								<span className="status">
									{player.id === currentPlayerId
										? "You"
										: player.hand.length === minHandLength
											? "Ready"
											: "Selecting..."}
								</span>
								<span className="drafted-count">
									({player.draftedCards.length} drafted)
								</span>
							</div>
						))}
					</div>
				</div>

				{allPlayersReady && (
					<div className="round-complete">
						{maxHandLength === 0 ? (
							<p>
								All cards have been drafted! Moving to scoring phase...
							</p>
						) : (
							<p>
								All players have made their selections. Moving to next round...
							</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
};
