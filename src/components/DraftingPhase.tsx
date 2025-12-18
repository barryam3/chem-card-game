import { useState, useEffect, useRef } from "react";
import type { DocumentReference } from "firebase/firestore";
import type { GameState, Player } from "../types";
import type { ChemistryElement } from "../data";
import { Card } from "./Card";
import { FaceDownCard } from "./FaceDownCard";
import {
	submitDraftSelection,
	submitMultipleDraftSelections,
	checkWordSpelling,
} from "../firebaseService";
import {
	getElementByAtomicNumber,
	getElementsFromAtomicNumbers,
} from "../gameLogic";
import {
	loadCommonWordsTrie,
	type PrecomputedWordChecker,
} from "../utils/wordTrie";
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
	const isHost =
		game.players.find((p) => p.id === currentPlayerId)?.isHost ?? false;
	const processedComputerPlayersRef = useRef<Set<string>>(new Set());
	const commonWordsTrieRef = useRef<PrecomputedWordChecker | null>(null);
	const trieLoadingRef = useRef(false);
	const processedWordSpellingRef = useRef<Set<string>>(new Set());

	// Load common words trie on mount (host only)
	useEffect(() => {
		if (isHost && !commonWordsTrieRef.current && !trieLoadingRef.current) {
			trieLoadingRef.current = true;
			loadCommonWordsTrie()
				.then((trie) => {
					commonWordsTrieRef.current = trie;
				})
				.catch((error) => {
					console.error("Failed to load common words trie:", error);
				})
				.finally(() => {
					trieLoadingRef.current = false;
				});
		}
	}, [isHost]);

	// Reset submitting state when game state changes (new round or phase change)
	useEffect(() => {
		if (previousRoundRef.current !== game.currentRound) {
			setIsSubmitting(false);
			setSelectedCardIndex(null);
			previousRoundRef.current = game.currentRound;
			// Reset processed computer players when round changes
			processedComputerPlayersRef.current.clear();
			processedWordSpellingRef.current.clear();
		}
	}, [game.currentRound]);

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
				word: winner.word || "", // Include the word
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

	// Process all computer players when round advances (only on host's client)
	useEffect(() => {
		if (!isHost || !gameDocRef || game.phase !== "drafting") return;

		// Find all computer players that need to pick a card for this round
		const computerPlayersToProcess = game.players.filter((player) => {
			const hasSubmitted = player.draftedCards.length >= game.currentRound;
			const needsPick =
				!hasSubmitted && player.isComputer && player.hand.length > 0;
			const alreadyProcessed = processedComputerPlayersRef.current.has(
				`${player.id}-${game.currentRound}`,
			);
			return needsPick && !alreadyProcessed;
		});

		if (computerPlayersToProcess.length === 0) return;

		// Process all computer players
		const processAllComputerPlayers = async () => {
			// First, check for word spelling opportunities (these need to be done individually)
			for (const player of computerPlayersToProcess) {
				if (player.hand.length === 0) continue;

				// Check if this player has already won (before checking if we've processed them)
				const hasWonWordRace = game.wordSpellingWinners.some(
					(w) => w.playerId === player.id,
				);

				// If they've already won, mark as processed and skip
				if (hasWonWordRace) {
					const wordSpellingKey = `${player.id}-${game.currentRound}`;
					processedWordSpellingRef.current.add(wordSpellingKey);
					continue;
				}

				const wordSpellingKey = `${player.id}-${game.currentRound}`;
				if (!processedWordSpellingRef.current.has(wordSpellingKey)) {
					const revealedCards = player.draftedCards.slice(
						0,
						game.currentRound - 1,
					);
					const revealedElements = getElementsFromAtomicNumbers(revealedCards);
					const revealedSymbols = revealedElements.map((el) => el.atomicSymbol);

					const canWinWordRace =
						revealedSymbols.length >= 3 &&
						commonWordsTrieRef.current &&
						placeholders.some((placeholder) => placeholder.isAvailable);

					if (canWinWordRace) {
						const trie = commonWordsTrieRef.current;
						if (trie) {
							const word = trie.findFirstWord(revealedSymbols);
							if (word) {
								try {
									await checkWordSpelling(gameDocRef, game, player.id, word);
									processedWordSpellingRef.current.add(wordSpellingKey);
								} catch (error) {
									// If they've already won, mark as processed to avoid retrying
									if (
										error instanceof Error &&
										error.message === "You have already spelled a word."
									) {
										processedWordSpellingRef.current.add(wordSpellingKey);
									}
									console.error("Computer player word spelling failed:", error);
								}
							}
						}
					}
				}
			}

			// Then, batch submit all card selections at once
			const selections = computerPlayersToProcess
				.filter((player) => player.hand.length > 0)
				.map((player) => {
					const randomIndex = Math.floor(Math.random() * player.hand.length);
					const processKey = `${player.id}-${game.currentRound}`;
					processedComputerPlayersRef.current.add(processKey);
					return {
						playerId: player.id,
						cardIndex: randomIndex,
					};
				});

			if (selections.length > 0) {
				try {
					await submitMultipleDraftSelections(gameDocRef, game, selections);
				} catch (error) {
					// If submission fails, remove from processed set to retry
					for (const selection of selections) {
						const processKey = `${selection.playerId}-${game.currentRound}`;
						processedComputerPlayersRef.current.delete(processKey);
					}
					console.error("Failed to submit computer player selections:", error);
				}
			}
		};

		// Start processing immediately
		processAllComputerPlayers();
	}, [game, gameDocRef, isHost, placeholders]);

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
		if (wordInput.length >= 3 && !wordSubmitting && gameDocRef) {
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

	const revealedAtomicNumbers = currentPlayer.draftedCards.slice(
		0,
		game.currentRound - 1,
	);
	const revealedCards = revealedAtomicNumbers
		.map((num) => getElementByAtomicNumber(num))
		.filter((el): el is ChemistryElement => el !== undefined);
	const hasEnoughSymbols = revealedCards.length >= 3;
	const hasWon = game.wordSpellingWinners.some(
		(winner) => winner.playerId === currentPlayerId,
	);
	const canWinWordRace =
		!hasWon &&
		hasEnoughSymbols &&
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
									Use 3 or more atomic symbols to spell a word before your
									opponents!
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
												hasEnoughSymbols
													? "Enter a word"
													: "Get 3 cards to spell a word"
											}
											disabled={wordSubmitting || !hasEnoughSymbols}
											autoComplete="off"
										/>
										<button
											type="submit"
											disabled={wordInput.length < 3 || wordSubmitting}
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
																<div className="word-winner-name">
																	{winner.playerName} (Round {winner.round})
																</div>
																{winner.word && (
																	<div className="word-winner-word">
																		"{winner.word}"
																	</div>
																)}
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
