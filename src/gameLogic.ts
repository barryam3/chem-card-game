import { gameData } from "./data";
import type { ChemistryElement } from "./data";
import type { GameScore } from "./types";

// Shuffle array using Fisher-Yates algorithm
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get deck size and hand size based on player count
export function getDeckConfig(players: number): {
  deckSize: number;
  handSize: number;
} {
  const configs: { [players: number]: { deckSize: number; handSize: number } } =
    {
      2: { deckSize: 36, handSize: 15 },
      3: { deckSize: 54, handSize: 15 },
      4: { deckSize: 54, handSize: 13 },
      5: { deckSize: 54, handSize: 10 },
      6: { deckSize: 86, handSize: 14 },
      7: { deckSize: 103, handSize: 14 },
      8: { deckSize: 103, handSize: 12 },
      9: { deckSize: 103, handSize: 11 },
      10: { deckSize: 103, handSize: 10 },
    };

  return configs[players] || { deckSize: 103, handSize: 10 };
}

// Deal cards to players
export function dealCards(players: number): ChemistryElement[][] {
  const { deckSize, handSize } = getDeckConfig(players);

  // Filter deck to only include cards with atomic number <= deckSize
  const filteredDeck = gameData.filter((card) => card.atomicNumber <= deckSize);
  const shuffledDeck = shuffleArray([...filteredDeck]);

  // Use the specific hand size from the config, not calculated from deck size
  const hands: ChemistryElement[][] = [];

  for (let i = 0; i < players; i++) {
    const startIndex = i * handSize;
    const endIndex = startIndex + handSize;
    hands.push(shuffledDeck.slice(startIndex, endIndex));
  }

  return hands;
}

// Calculate atomic number score (longest consecutive sequence squared, capped at 4)
export function calculateAtomicNumberScore(cards: ChemistryElement[]): number {
  if (cards.length === 0) return 0;

  const atomicNumbers = cards
    .map((card) => card.atomicNumber)
    .sort((a, b) => a - b);
  let maxSequence = 1;
  let currentSequence = 1;

  for (let i = 1; i < atomicNumbers.length; i++) {
    if (atomicNumbers[i] === atomicNumbers[i - 1] + 1) {
      currentSequence++;
      maxSequence = Math.max(maxSequence, currentSequence);
    } else {
      currentSequence = 1;
    }
  }

  // Cap the sequence length at 4 (minimum 2, maximum 4)
  const cappedSequence = Math.min(Math.max(maxSequence, 2), 4);
  return cappedSequence * cappedSequence;
}

// Calculate atomic mass score (compare with neighbors)
export function calculateAtomicMassScore(
  playerCards: ChemistryElement[],
  leftNeighborCards: ChemistryElement[],
  rightNeighborCards: ChemistryElement[]
): number {
  const playerMass = playerCards.reduce((sum, card) => sum + card.massGroup, 0);
  const leftMass = leftNeighborCards.reduce(
    (sum, card) => sum + card.massGroup,
    0
  );
  const rightMass = rightNeighborCards.reduce(
    (sum, card) => sum + card.massGroup,
    0
  );

  let score = 0;
  if (playerMass > leftMass) score += 2;
  if (playerMass < leftMass) score -= 2;
  if (playerMass > rightMass) score += 2;
  if (playerMass < rightMass) score -= 2;

  return score;
}

// Check if a 5-letter word can be spelled with atomic symbols
export function canSpellWord(cards: ChemistryElement[], word: string): boolean {
  const symbols = cards.map((card) => card.atomicSymbol);
  return canSpellWordWithSymbols(symbols, word);
}

export function canSpellWordWithSymbols(
  atomicSymbols: string[],
  word: string
): boolean {
  if (word.length === 0) return true;
  return atomicSymbols.some(
    (atomicSymbol) =>
      word.toLowerCase().startsWith(atomicSymbol.toLowerCase()) &&
      canSpellWordWithSymbols(
        atomicSymbols.filter((s) => s !== atomicSymbol),
        word.slice(atomicSymbol.length)
      )
  );
}

// Calculate radioactivity score
export function calculateRadioactivityScore(cards: ChemistryElement[]): number {
  const radioactiveCount = cards.filter((card) => card.radioactive).length;

  if (radioactiveCount >= 2) return 7;
  if (radioactiveCount === 1) return -3;
  return 0;
}

// Calculate ionization score (matching positive/negative ion pairs)
export function calculateIonizationScore(cards: ChemistryElement[]): number {
  const positiveIons: { [charge: number]: number } = {};
  const negativeIons: { [charge: number]: number } = {};

  for (const card of cards) {
    if (card.positiveIon) {
      positiveIons[card.positiveIon] =
        (positiveIons[card.positiveIon] || 0) + 1;
    }
    if (card.negativeIon) {
      negativeIons[card.negativeIon] =
        (negativeIons[card.negativeIon] || 0) + 1;
    }
  }

  let score = 0;
  for (const charge of Object.keys(positiveIons)) {
    const chargeNum = Number.parseInt(charge);
    const pairs = Math.min(
      positiveIons[chargeNum],
      negativeIons[chargeNum] || 0
    );
    score += pairs * 5;
  }

  return score;
}

// Calculate family score (capped at maximum of 6 elements)
export function calculateFamilyScore(cards: ChemistryElement[]): number {
  const familyCounts: Record<string, number> = {};

  for (const card of cards) {
    familyCounts[card.family] = (familyCounts[card.family] || 0) + 1;
  }

  const uniqueFamilies = Object.keys(familyCounts).length;
  const largestFamily = Math.max(...Object.values(familyCounts));

  const elementsToScore = Math.max(uniqueFamilies, largestFamily);

  // Cap at maximum of 6 elements
  const cappedElements = Math.min(elementsToScore, 6);

  // Family scoring table (capped at 6)
  const familyScores: Record<number, number> = {
    1: 0,
    2: 1,
    3: 3,
    4: 6,
    5: 10,
    6: 15,
  };

  return familyScores[cappedElements] || 0;
}

// Calculate word spelling points for a specific player
export function calculateWordSpellingPoints(
  playerId: string,
  wordSpellingWinners: { playerId: string; round: number }[]
): number {
  if (wordSpellingWinners.length === 0) return 0;
  
  // Group winners by round
  const winnersByRound = wordSpellingWinners.reduce((acc, winner) => {
    if (!acc[winner.round]) acc[winner.round] = [];
    acc[winner.round].push(winner);
    return acc;
  }, {} as Record<number, typeof wordSpellingWinners>);
  
  const sortedRounds = Object.keys(winnersByRound).map(Number).sort((a, b) => a - b);
  const pointValues = [8, 5, 2];
  let currentPointIndex = 0;
  
  for (const round of sortedRounds) {
    const roundWinners = winnersByRound[round];
    const points = pointValues[currentPointIndex] || 0;
    
    // Check if this player is in this round's winners
    if (roundWinners.some(winner => winner.playerId === playerId)) {
      return points;
    }
    
    currentPointIndex += roundWinners.length; // Skip next places if multiple winners
  }
  
  return 0;
}

// Calculate total score for a player
export function calculateTotalScore(
  playerCards: ChemistryElement[],
  leftNeighborCards: ChemistryElement[],
  rightNeighborCards: ChemistryElement[],
  wordSpellingBonus = 0,
  includeRadioactivity = true
): GameScore {
  const atomicNumber = calculateAtomicNumberScore(playerCards);
  const atomicMass = calculateAtomicMassScore(
    playerCards,
    leftNeighborCards,
    rightNeighborCards
  );
  const atomicSymbol = wordSpellingBonus;
  const radioactivity = includeRadioactivity ? calculateRadioactivityScore(playerCards) : 0;
  const ionization = calculateIonizationScore(playerCards);
  const family = calculateFamilyScore(playerCards);

  const total =
    atomicNumber +
    atomicMass +
    atomicSymbol +
    radioactivity +
    ionization +
    family;

  return {
    atomicNumber,
    atomicMass,
    atomicSymbol,
    radioactivity,
    ionization,
    family,
    total,
  };
}

// Generate a random game ID
export function generateGameId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
