import { useState, useEffect } from "react";
import { DocumentReference } from "firebase/firestore";
import type { GameState } from "../types";
import type { ChemistryElement } from "../data";
import { Card } from "./Card";
import { FaceDownCard } from "./FaceDownCard";
import { submitDraftSelection, checkWordSpelling } from "../firebaseService";
import { getElementByAtomicNumber } from "../gameLogic";
import "./DraftingPhase.scss";

interface DraftingPhaseProps {
	game: GameState;
	gameDocRef: DocumentReference | null;
	currentPlayerId: string;
}

export const DraftingPhase: React.FC<DraftingPhaseProps> = ({
	game,
	gameDocRef,
	currentPlayerId,
}) => {
	const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(
		null,
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [wordInput, setWordInput] = useState("");
	const [wordSubmitting, setWordSubmitting] = useState(false);
	const [wordError, setWordError] = useState("");

	// Reset submitting state when game state changes (new round or phase change)
	useEffect(() => {
		setIsSubmitting(false);
		setSelectedCardIndex(null);
	}, [game.currentRound]);

	const currentPlayer = game.players.find((p) => p.id === currentPlayerId);
	if (!currentPlayer) {
		return <div>Player not found</div>;
	}

	// Check if current player has already submitted for this round
	// They have submitted if they have at least as many drafted cards as the current round
	const hasSubmitted = currentPlayer.draftedCards.length >= game.currentRound;

	const handleCardSelect = async (index: number) => {
		// Don't allow selection if currently submitting or already submitted
		if (isSubmitting || hasSubmitted || !gameDocRef) return;
		
		setSelectedCardIndex(index);
		setIsSubmitting(true);
		
		const success = await submitDraftSelection(
			gameDocRef,
			game,
			currentPlayerId,
			index,
		);

		if (!success) {
			alert("Failed to submit selection. Please try again.");
			setSelectedCardIndex(null);
		}
		setIsSubmitting(false);
	};


	const handleWordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (wordInput.length === 5 && !wordSubmitting && gameDocRef) {
			setWordSubmitting(true);
			setWordError("");

			try {
				const success = await checkWordSpelling(
					gameDocRef,
					game,
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

	// Check if all players have made their selection for this round
	// Each player should have at least as many drafted cards as the current round number
	const allPlayersReady = game.players.every(
		(player) => player.draftedCards.length >= game.currentRound
	);

	return (
		<div className="drafting-phase">
			<div className="drafting-header">
				<div className="round-info">
					Round {game.currentRound} of {game.totalRounds}
				</div>
			</div>

			<div className="drafting-content">
				<div className="hand-section">
					<h3>Your Hand - Select a card to draft:</h3>
					<p className="drafting-info">
						After all players select a card, hands will be passed to the next
						player.
					</p>
					<div className="hand">
						{currentPlayer.hand
							.map((atomicNumber, index) => ({
								atomicNumber,
								originalIndex: index,
							}))
							.sort((a, b) => a.atomicNumber - b.atomicNumber)
							.map(({ atomicNumber, originalIndex }) => {
								const element = getElementByAtomicNumber(atomicNumber);
								if (!element) return null;
								return (
									<Card
										key={`${atomicNumber}-${originalIndex}`}
										element={element}
										onClick={() => handleCardSelect(originalIndex)}
										isSelected={selectedCardIndex === originalIndex}
										isDisabled={isSubmitting || (hasSubmitted && allPlayersReady)}
									/>
								);
							})}
					</div>
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
							const revealedAtomicNumbers = player.draftedCards.slice(
								0,
								game.currentRound - 1,
							);
							const unrevealedAtomicNumbers = player.draftedCards.slice(
								game.currentRound - 1,
							);
							const revealedCards = revealedAtomicNumbers
								.map((num) => getElementByAtomicNumber(num))
								.filter((el): el is ChemistryElement => el !== undefined);
							const unrevealedCards = unrevealedAtomicNumbers
								.map((num) => getElementByAtomicNumber(num))
								.filter((el): el is ChemistryElement => el !== undefined);

							return (
								<div key={player.id} className="player-drafted-cards">
									<h4
										className={`player-name ${player.id === currentPlayerId ? "current-player" : ""}`}
									>
										{player.name}
										{player.id === currentPlayerId && " (You)"}
									</h4>

									{(revealedCards.length > 0 || unrevealedCards.length > 0) && (
										<div className="card-group">
											<div className="drafted-cards">
												{/* Show revealed cards first */}
												{revealedCards
													.sort((a, b) => a.atomicNumber - b.atomicNumber)
													.map((element, index) => (
														<Card
															key={`${player.id}-revealed-${element.atomicNumber}-${index}`}
															element={element}
														/>
													))}

												{/* Show unrevealed cards for current player, face-down cards for others */}
												{unrevealedCards.length > 0 &&
													(player.id === currentPlayerId ? (
														// Current player: show actual unrevealed cards with dimmed styling
														<div className="unrevealed-cards">
															{unrevealedCards
																.sort((a, b) => a.atomicNumber - b.atomicNumber)
																.map((element, index) => (
																	<Card
																		key={`${player.id}-unrevealed-${element.atomicNumber}-${index}`}
																		element={element}
																	/>
																))}
														</div>
													) : (
														// Other players: show face-down cards
														Array.from({ length: unrevealedCards.length }).map(
															(_, index) => (
																<FaceDownCard
																	key={`${player.id}-facedown-${index}`}
																/>
															),
														)
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
						const revealedAtomicNumbers = currentPlayer.draftedCards.slice(
							0,
							game.currentRound - 1,
						);
						const revealedCards = revealedAtomicNumbers
							.map((num) => getElementByAtomicNumber(num))
							.filter((el): el is ChemistryElement => el !== undefined);
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
			</div>
		</div>
	);
};
