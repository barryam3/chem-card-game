import type React from "react";
import "./RulesModal.scss";

interface RulesModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
	if (!isOpen) return null;

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			onClose();
		}
	};

	return (
		<div
			className="rules-modal-overlay"
			onClick={handleOverlayClick}
			onKeyDown={handleKeyDown}
			tabIndex={-1}
		>
			<div className="rules-modal-content">
				<div className="rules-modal-header">
					<h2>Chemistry Card Game Rules</h2>
					<button
						type="button"
						className="close-button"
						onClick={onClose}
						aria-label="Close rules"
					>
						×
					</button>
				</div>
				<div className="rules-modal-body">
					<div className="rules-section">
						<h3>Game Overview</h3>
						<p>
							This game is played with a deck of cards where each card is an
							element of the periodic table.
						</p>
					</div>

					<div className="rules-section">
						<h3>Gameplay</h3>
						<p>
							Each player privately selects a card from their hand to draft.
							Once all players have made their selection, they place the drafted
							card face up in front of them. Then, they pass the remaining cards
							to the left. The process repeats until all of the cards have been
							drafted.
						</p>
					</div>

					<div className="rules-section">
						<h3>Scoring</h3>
						<p>
							The goal of the game is to score the most points. Scoring is as
							follows:
						</p>

						<div className="scoring-rule">
							<h4>Atomic Number</h4>
							<p>
								Players earn points equal to the square of the longest sequence
								of consecutive atomic numbers they have drafted, up to a maximum
								length of 4. For example, if a player has atomic numbers 1, 5,
								6, 7, 10, 11, and 13, they would score 9 points for their
								longest sequence of 3: 5, 6, and 7.
							</p>
							<div className="points-table">
								<table>
									<thead>
										<tr>
											<th>Elements</th>
											<th>2</th>
											<th>3</th>
											<th>4+</th>
										</tr>
									</thead>
									<tbody>
										<tr>
											<td>
												<strong>Points</strong>
											</td>
											<td>4</td>
											<td>9</td>
											<td>16</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>

						<div className="scoring-rule">
							<h4>Atomic Mass</h4>
							<p>
								If the total atomic mass of your drafted cards is greater than
								that of your neighbor (the players passing to and receiving from
								you), you score 4 points. If it is lower, you lose 4 points. (In
								a two-player game, you only have one opponent.)
							</p>
						</div>

						<div className="scoring-rule">
							<h4>Atomic Symbol</h4>
							<p>
								Be the 1st, 2nd, or 3rd to spell a 3-symbol or longer word with
								your atomic symbols to score points. If two players both spell a
								word on the same turn, they each get the points for that
								placing, and the next place is skipped for scoring. For example,
								if Barry and Suzy tie to be the first to spell a word on turn 4,
								then they each score 8 points. If Heather then spells a word on
								turn 5, she scores 2 points.
							</p>
							<div className="points-table">
								<table>
									<thead>
										<tr>
											<th>Place</th>
											<th>1st</th>
											<th>2nd</th>
											<th>3rd</th>
										</tr>
									</thead>
									<tbody>
										<tr>
											<td>
												<strong>Points</strong>
											</td>
											<td>8</td>
											<td>5</td>
											<td>2</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>

						<div className="scoring-rule">
							<h4>Ionization</h4>
							<p>
								Score 3 points for each matching pair of positive and negative
								ions with the same number of charges. Each element can only be
								used in one pair.
							</p>
						</div>

						<div className="scoring-rule">
							<h4>Family</h4>
							<p>Score 1 point per unique element family.</p>
							<p>
								Score points for the number of elements you have in your largest
								family as follows:
							</p>
							<div className="points-table">
								<table>
									<thead>
										<tr>
											<th>Elements</th>
											<th>2</th>
											<th>3</th>
											<th>4</th>
											<th>5</th>
											<th>6+</th>
										</tr>
									</thead>
									<tbody>
										<tr>
											<td>
												<strong>Points</strong>
											</td>
											<td>1</td>
											<td>3</td>
											<td>6</td>
											<td>10</td>
											<td>15</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>

						<div className="scoring-rule">
							<h4>Radioactivity (7+ players only)</h4>
							<p>
								If you have at least 2 radioactive elements, you score 7 points.
								However, if you have exactly 1, you lose 3 points.
							</p>
						</div>
					</div>

					<div className="rules-section">
						<h3>Winning</h3>
						<p>
							The player with the most total points wins. If there is a tie, the
							player who drafted the element with the highest atomic number
							wins.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};
