import { useState, useEffect, useRef } from "react";
import type { DocumentReference } from "firebase/firestore";
import type { GameState, Player } from "../types";
import type { ChemistryElement } from "../data";
import { Card } from "./Card";
import { FaceDownCard } from "./FaceDownCard";
import { submitDraftSelection, checkWordSpelling } from "../firebaseService";
import { getElementByAtomicNumber } from "../gameLogic";
import "./DraftingPhase.scss";

interface DraftingPhaseProps {
	game: Omit<GameState, "expireAt">;
	gameDocRef: DocumentReference | null;
	currentPlayerId: string;
}

function playersInOrder(players: Player[], currentPlayerIndex: number) {
	return players
		.slice(currentPlayerIndex)
		.concat(players.slice(0, currentPlayerIndex));
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
	const previousRoundRef = useRef(game.currentRound);
	const isHost = game.players.find((p) => p.id === currentPlayerId)?.isHost ?? false;
	const processedComputerPlayersRef = useRef<Set<string>>(new Set());

	// Reset submitting state when game state changes (new round or phase change)
	useEffect(() => {
		if (previousRoundRef.current !== game.currentRound) {
			setIsSubmitting(false);
			setSelectedCardIndex(null);
			previousRoundRef.current = game.currentRound;
			// Reset processed computer players when round changes
			processedComputerPlayersRef.current.clear();
		}
	}, [game.currentRound]);

	// Auto-pick cards for computer players (only on host's client)
	useEffect(() => {
		if (!isHost || !gameDocRef || game.phase !== "drafting") return;

		// Find computer players that need to pick a card for this round
		const computerPlayersToProcess = game.players.filter((player) => {
			const hasSubmitted = player.draftedCards.length >= game.currentRound;
			const needsPick = !hasSubmitted && player.isComputer && player.hand.length > 0;
			const alreadyProcessed = processedComputerPlayersRef.current.has(
				`${player.id}-${game.currentRound}`
			);
			return needsPick && !alreadyProcessed;
		});

		if (computerPlayersToProcess.length === 0) return;

		// Process each computer player with a small delay to avoid race conditions
		const processComputerPlayer = async (player: typeof game.players[0]) => {
			if (player.hand.length === 0) return;

			// Pick a random card index
			const randomIndex = Math.floor(Math.random() * player.hand.length);

			// Mark as processed before submitting to avoid duplicate submissions
			const processKey = `${player.id}-${game.currentRound}`;
			processedComputerPlayersRef.current.add(processKey);

			try {
				await submitDraftSelection(
					gameDocRef,
					game,
					player.id,
					randomIndex
				);
			} catch (error) {
				// If submission fails, remove from processed set to retry
				processedComputerPlayersRef.current.delete(processKey);
				console.error("Failed to submit computer player selection:", error);
			}
		};

		// Process computer players sequentially with small delays
		computerPlayersToProcess.forEach((player, index) => {
			setTimeout(() => {
				processComputerPlayer(player);
			}, index * 100); // Small delay between each submission
		});
	}, [game, gameDocRef, isHost]);

	const currentPlayerIndex = game.players.findIndex(
		(p) => p.id === currentPlayerId,
	);
	if (currentPlayerIndex === -1) {
		return <div>Player not found</div>;
	}
	const currentPlayer = game.players[currentPlayerIndex];
	const isCurrentPlayerComputer = currentPlayer.isComputer ?? false;

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
		if (wordInput.length >= 5 && !wordSubmitting && gameDocRef) {
			setWordSubmitting(true);
			setWordError("");

			try {
				await checkWordSpelling(gameDocRef, game, currentPlayerId, wordInput);
				setWordInput("");
			} catch (error: unknown) {
				setWordError(
					error instanceof Error
						? error.message
						: "Error. Try refreshing the page.",
				);
			} finally {
				setWordSubmitting(false);
			}
		}
	};

	// Check if all players have made their selection for this round
	// Each player should have at least as many drafted cards as the current round number
	const allPlayersReady = game.players.every(
		(player) => player.draftedCards.length >= game.currentRound,
	);

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
	const pointValues = game.players.length > 2 ? [8, 5, 2] : [8, 5];
	let currentPointIndex = 0;

	// Create array of all winners with their points
	const allWinners = sortedRounds.flatMap((round) => {
		const roundWinners = winnersByRound[round];
		const points = pointValues[currentPointIndex] || 0;
		currentPointIndex += roundWinners.length; // Skip next places if multiple winners

		return roundWinners.map((winner) => {
			const player = game.players.find((p) => p.id === winner.playerId);
			return {
				...winner,
				playerName: player?.name || "Unknown",
				points,
				round,
			};
		});
	});

	const winnerPointsThisRound = allWinners.find(
		(winner) => winner.round === game.currentRound,
	)?.points;

	// Create placeholders only for available places
	const placeholders = pointValues.map((points, index) => {
		const place = index + 1;
		const label =
			place === 1 ? "1st Place" : place === 2 ? "2nd Place" : "3rd Place";
		return {
			place,
			points,
			label,
			isAvailable:
				place > allWinners.length || points === winnerPointsThisRound,
		};
	});
	const revealedAtomicNumbers = currentPlayer.draftedCards.slice(
		0,
		game.currentRound - 1,
	);
	const revealedCards = revealedAtomicNumbers
		.map((num) => getElementByAtomicNumber(num))
		.filter((el): el is ChemistryElement => el !== undefined);
	const symbolLengths = revealedCards.map((c) => c.atomicSymbol.length);
	const hasEnoughLetters = symbolLengths.reduce((a, b) => a + b, 0) >= 5;
	const hasWon = game.wordSpellingWinners.some(
		(winner) => winner.playerId === currentPlayerId,
	);
	const canWinWordRace =
		!hasWon &&
		!isCurrentPlayerComputer &&
		placeholders.some((placeholder) => placeholder.isAvailable);

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
										isDisabled={
											isSubmitting || (hasSubmitted && allPlayersReady)
										}
									/>
								);
							})}
					</div>
				</div>

				<div className="word-spelling-section">
					<h3>Word Race:</h3>
					<div className="word-spelling-content">
						{canWinWordRace && (
							<div className="word-form-section">
								<p className="drafting-info">
									Use your atomic symbols to spell a word with 5 or more letters
									before your opponents!
								</p>
								<form onSubmit={handleWordSubmit} className="word-form">
									<div className="word-input-group">
										<input
											id="wordInput"
											type="text"
											value={wordInput}
											onChange={(e) =>
												setWordInput(e.target.value.toUpperCase())
											}
											placeholder={
												hasEnoughLetters
													? "Enter a word"
													: "Get 5 letters to spell a word"
											}
											disabled={wordSubmitting || !hasEnoughLetters}
											autoComplete="off"
										/>
										<button
											type="submit"
											disabled={wordInput.length < 5 || wordSubmitting}
										>
											{wordSubmitting ? "Checking..." : "Submit Word"}
										</button>
									</div>
									{wordError && <div className="word-error">{wordError}</div>}
								</form>
							</div>
						)}

						{/* Word Winners - Right Side */}
						<div className="word-winners-section">
							<div className="word-winners-grid">
								{(() => {
									return placeholders.map((placeholder) => {
										// Find winners for this place
										const winnersForPlace = allWinners.filter(
											(winner) => winner.points === placeholder.points,
										);

										return (
											<div
												key={placeholder.place}
												className="word-winner-place"
											>
												<div className="place-label">{placeholder.label}</div>
												<div className="place-winners">
													{winnersForPlace.length > 0 ? (
														winnersForPlace.map((winner) => (
															<div
																key={winner.playerId}
																className="word-winner"
															>
																{winner.playerName} (Round {winner.round})
															</div>
														))
													) : (
														<div className="place-empty">
															{placeholder.isAvailable
																? "Unclaimed"
																: "Claimed"}
														</div>
													)}
												</div>
											</div>
										);
									});
								})()}
							</div>
						</div>
					</div>
				</div>

				<div className="drafted-cards-section">
					<h3>Drafted Cards:</h3>
					{playersInOrder(game.players, currentPlayerIndex).map((player, i) => {
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

						// Determine the player's position in the turn order
						const isCurrentPlayer = player.id === currentPlayerId;
						const isReceivingFromYou = i === 1; // Next player after current player
						const isPassingToYou = i === game.players.length - 1; // Last player in order

						let playerLabel = player.name;
						if (player.isComputer) {
							playerLabel += " 🤖";
						}
						if (isCurrentPlayer) {
							playerLabel += " (You)";
						} else if (game.players.length > 2 && isReceivingFromYou) {
							playerLabel += " (Receiving from you)";
						} else if (game.players.length > 2 && isPassingToYou) {
							playerLabel += " (Passing to you)";
						}

						return (
							<div
								key={player.id}
								className={`player-drafted-cards ${isCurrentPlayer ? "current-player-section" : ""}`}
							>
								<h4 className="player-name">{playerLabel}</h4>

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

											{/* Show unrevealed cards - actual cards for current player, face-down for others */}
											{unrevealedCards.length > 0 &&
												(isCurrentPlayer ? (
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
													Array.from({
														length: unrevealedCards.length,
													}).map((_, index) => (
														<FaceDownCard
															key={`${player.id}-facedown-${index}`}
														/>
													))
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
			</div>
		</div>
	);
};
