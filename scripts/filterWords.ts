import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gameData } from "../src/data.ts";
import { canSpellWordWithSymbols } from "../src/gameLogic.ts";

// Get all unique atomic symbols from gameData
const allAtomicSymbols = gameData.map((element) => element.atomicSymbol);

console.log(`Total atomic symbols available: ${allAtomicSymbols.length}`);
console.log(`Symbols: ${allAtomicSymbols.join(", ")}`);

// Get file path from command line argument
const fileArg = process.argv[2];
if (!fileArg) {
  console.error("Error: Please provide a file path as an argument");
  console.error("Usage: npm run filter:words <file-path>");
  console.error("Example: npm run filter:words public/assets/words.txt");
  process.exit(1);
}

// Resolve the file path (handles both relative and absolute paths)
const wordsPath = resolve(process.cwd(), fileArg);
console.log(`Reading words from: ${wordsPath}`);

const wordsContent = readFileSync(wordsPath, "utf-8");
const words = wordsContent
  .split("\n")
  .map((word) => word.trim())
  .filter((word) => word.length > 0);

console.log(`Total words in file: ${words.length}`);

// Filter words that can be spelled with atomic symbols
const filteredWords: string[] = [];
let processed = 0;

for (const word of words) {
  // Check if word can be spelled using canSpellWordWithSymbols from gameLogic.ts
  // Note: This function doesn't allow symbol reuse (each symbol can only be used once)
  const result = canSpellWordWithSymbols(allAtomicSymbols, word.toLowerCase());
  if (result !== null && result.length >= 3) {
    filteredWords.push(word);
  }

  processed++;
  if (processed % 10000 === 0) {
    console.log(
      `Processed ${processed}/${words.length} words... (found ${filteredWords.length} so far)`
    );
  }
}

console.log(`\nFiltered words: ${filteredWords.length} out of ${words.length}`);
console.log(
  `Filter rate: ${((filteredWords.length / words.length) * 100).toFixed(2)}%`
);

// Write filtered words back to the file
const outputContent = `${filteredWords.join("\n")}\n`;
writeFileSync(wordsPath, outputContent, "utf-8");

console.log(`\n✅ Successfully filtered and saved words to ${wordsPath}`);
