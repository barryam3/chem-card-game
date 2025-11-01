import { gameData } from "./data";
import type { ChemistryElement } from "./data";
import type { GameScore } from "./types";

// Helper function to get element by atomic number
export function getElementByAtomicNumber(
  atomicNumber: number
): ChemistryElement | undefined {
  return gameData.find((element) => element.atomicNumber === atomicNumber);
}

// Helper function to convert atomic numbers to elements
export function getElementsFromAtomicNumbers(
  atomicNumbers: number[]
): ChemistryElement[] {
  return atomicNumbers
    .map((num) => getElementByAtomicNumber(num))
    .filter((el): el is ChemistryElement => el !== undefined);
}

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
      2: { deckSize: 36, handSize: 10 },
      3: { deckSize: 54, handSize: 10 },
      4: { deckSize: 54, handSize: 10 },
      5: { deckSize: 86, handSize: 10 },
      6: { deckSize: 86, handSize: 10 },
      7: { deckSize: 103, handSize: 10 },
      8: { deckSize: 103, handSize: 10 },
      9: { deckSize: 103, handSize: 10 },
      10: { deckSize: 103, handSize: 10 },
    };

  return configs[players] || { deckSize: 103, handSize: 10 };
}

// Deal cards to players
export function dealCards(players: number): number[][] {
  const { deckSize, handSize } = getDeckConfig(players);

  // Filter deck to only include cards with atomic number <= deckSize
  const filteredDeck = gameData.filter((card) => card.atomicNumber <= deckSize);
  const shuffledDeck = shuffleArray([...filteredDeck]);

  // Use the specific hand size from the config, not calculated from deck size
  const hands: number[][] = [];

  for (let i = 0; i < players; i++) {
    const startIndex = i * handSize;
    const endIndex = startIndex + handSize;
    // Extract atomic numbers instead of full elements
    hands.push(
      shuffledDeck
        .slice(startIndex, endIndex)
        .map((element) => element.atomicNumber)
    );
  }

  return hands;
}

// Calculate atomic number score (longest consecutive sequence squared, capped at 4)
export function calculateAtomicNumberScore(atomicNumbers: number[]): number {
  if (atomicNumbers.length === 0) return 0;

  const sortedNumbers = [...atomicNumbers].sort((a, b) => a - b);
  let maxSequence = 1;
  let currentSequence = 1;

  for (let i = 1; i < sortedNumbers.length; i++) {
    if (sortedNumbers[i] === sortedNumbers[i - 1] + 1) {
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
export function calculateatomicWeightScore(
  playerAtomicNumbers: number[],
  leftNeighborAtomicNumbers: number[],
  rightNeighborAtomicNumbers?: number[]
): number {
  const playerElements = getElementsFromAtomicNumbers(playerAtomicNumbers);
  const leftElements = getElementsFromAtomicNumbers(leftNeighborAtomicNumbers);
  const rightElements = rightNeighborAtomicNumbers
    ? getElementsFromAtomicNumbers(rightNeighborAtomicNumbers)
    : null;

  const playerMass = playerElements.reduce(
    (sum, card) => sum + card.atomicWeight,
    0
  );
  const leftMass = leftElements.reduce(
    (sum, card) => sum + card.atomicWeight,
    0
  );
  const rightMass = rightElements?.reduce(
    (sum, card) => sum + card.atomicWeight,
    0
  );

  let score = 0;
  if (playerMass > leftMass) score += 4;
  if (playerMass < leftMass) score -= 4;
  if (rightMass) {
    if (playerMass > rightMass) score += 4;
    if (playerMass < rightMass) score -= 4;
  }

  return score;
}

// Check if a 5-letter word can be spelled with atomic symbols
export function canSpellWord(atomicNumbers: number[], word: string): boolean {
  const elements = getElementsFromAtomicNumbers(atomicNumbers);
  const symbols = elements.map((card) => card.atomicSymbol);
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
export function calculateRadioactivityScore(atomicNumbers: number[]): number {
  const elements = getElementsFromAtomicNumbers(atomicNumbers);
  const radioactiveCount = elements.filter((card) => card.radioactive).length;

  if (radioactiveCount >= 2) return 7;
  if (radioactiveCount === 1) return -3;
  return 0;
}

// Calculate ionization score (matching positive/negative ion pairs)
export function calculateIonizationScore(atomicNumbers: number[]): number {
  const elements = getElementsFromAtomicNumbers(atomicNumbers);
  const positiveIons: { [charge: number]: number } = {};
  const negativeIons: { [charge: number]: number } = {};

  for (const card of elements) {
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
    score += pairs * 3;
  }

  return score;
}

export function calculateSameFamilyScore(atomicNumbers: number[]): number {
  const elements = getElementsFromAtomicNumbers(atomicNumbers);
  const familyCounts: Record<string, number> = {};

  for (const card of elements) {
    familyCounts[card.family] = (familyCounts[card.family] || 0) + 1;
  }

  const largestFamily = Math.max(...Object.values(familyCounts));

  const cappedElements = Math.min(largestFamily, 6);

  const familyScores: Record<number, number> = {
    2: 1,
    3: 3,
    4: 6,
    5: 10,
    6: 15,
  };

  return familyScores[cappedElements] || 0;
}

export function calculateDifferentFamiliesScore(
  atomicNumbers: number[]
): number {
  const elements = getElementsFromAtomicNumbers(atomicNumbers);
  const familyCounts: Record<string, number> = {};

  for (const card of elements) {
    familyCounts[card.family] = (familyCounts[card.family] || 0) + 1;
  }

  const uniqueFamilies = Object.keys(familyCounts).length;

  return uniqueFamilies;
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

  const sortedRounds = Object.keys(winnersByRound)
    .map(Number)
    .sort((a, b) => a - b);
  const pointValues = [8, 5, 2];
  let currentPointIndex = 0;

  for (const round of sortedRounds) {
    const roundWinners = winnersByRound[round];
    const points = pointValues[currentPointIndex] || 0;

    // Check if this player is in this round's winners
    if (roundWinners.some((winner) => winner.playerId === playerId)) {
      return points;
    }

    currentPointIndex += roundWinners.length; // Skip next places if multiple winners
  }

  return 0;
}

// Calculate total score for a player
export function calculateTotalScore(
  playerAtomicNumbers: number[],
  leftNeighborAtomicNumbers: number[],
  rightNeighborAtomicNumbers?: number[],
  wordSpellingBonus = 0,
  includeRadioactivity = true
): GameScore {
  const atomicNumber = calculateAtomicNumberScore(playerAtomicNumbers);
  const atomicWeight = calculateatomicWeightScore(
    playerAtomicNumbers,
    leftNeighborAtomicNumbers,
    rightNeighborAtomicNumbers
  );
  const atomicSymbol = wordSpellingBonus;
  const radioactivity = includeRadioactivity
    ? calculateRadioactivityScore(playerAtomicNumbers)
    : 0;
  const ionization = calculateIonizationScore(playerAtomicNumbers);
  const sameFamily = calculateSameFamilyScore(playerAtomicNumbers);
  const differentFamilies =
    calculateDifferentFamiliesScore(playerAtomicNumbers);

  const total =
    atomicNumber +
    atomicWeight +
    atomicSymbol +
    radioactivity +
    ionization +
    sameFamily +
    differentFamilies;

  return {
    atomicNumber,
    atomicWeight,
    atomicSymbol,
    radioactivity,
    ionization,
    sameFamily,
    differentFamilies,
    total,
  };
}

// Generate a random game ID
export function generateGameId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
