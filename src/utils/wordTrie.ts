import { gameData } from "../data";

const MIN_WORD_SYMBOLS = 3;

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  words: string[] = []; // Complete words ending here
}

export class PrecomputedWordChecker {
  private root: TrieNode;
  private allSymbols: string[];

  constructor(validWords: Set<string>, allPossibleSymbols: string[]) {
    this.root = new TrieNode();
    this.allSymbols = allPossibleSymbols.map((s) => s.toLowerCase());

    // Build trie of all valid words using atomic symbols
    for (const word of validWords) {
      this.addWordToTrie(word);
    }
  }

  private addWordToTrie(word: string): void {
    const wordLower = word.toLowerCase();

    const buildPaths = (pos: number, node: TrieNode, path: string[]): void => {
      if (pos === wordLower.length) {
        node.words.push(wordLower);
        return;
      }

      for (const symbol of this.allSymbols) {
        const remaining = wordLower.slice(pos, pos + symbol.length);
        if (remaining === symbol) {
          if (!node.children.has(symbol)) {
            node.children.set(symbol, new TrieNode());
          }
          const childNode = node.children.get(symbol);
          if (childNode) {
            buildPaths(pos + symbol.length, childNode, [...path, symbol]);
          }
        }
      }
    };

    buildPaths(0, this.root, []);
  }

  findFirstWord(
    playerSymbols: string[],
    minSymbols: number = MIN_WORD_SYMBOLS
  ): string | null {
    if (playerSymbols.length === 0) {
      return null;
    }

    const playerSymbolsLower = playerSymbols.map((s) => s.toLowerCase());
    const playerMultiset = new Map<string, number>();

    for (const s of playerSymbolsLower) {
      playerMultiset.set(s, (playerMultiset.get(s) || 0) + 1);
    }

    // DFS to find shortest word
    const dfs = (
      node: TrieNode,
      usedCount: Map<string, number>,
      depth: number
    ): string | null => {
      // Check if we've found a word with enough symbols
      if (depth >= minSymbols && node.words.length > 0) {
        return node.words[0]; // Return first (shortest) word
      }

      // Try extending with each available symbol
      for (const [symbol, childNode] of node.children.entries()) {
        const availableCount = playerMultiset.get(symbol) || 0;
        const used = usedCount.get(symbol) || 0;

        if (availableCount > used) {
          usedCount.set(symbol, used + 1);
          const result = dfs(childNode, usedCount, depth + 1);
          usedCount.set(symbol, used);

          if (result) {
            return result;
          }
        }
      }

      return null;
    };

    return dfs(this.root, new Map(), 0);
  }
}

// Load common words and create trie
let commonWordsTrie: PrecomputedWordChecker | null = null;

export async function loadCommonWordsTrie(): Promise<PrecomputedWordChecker> {
  if (commonWordsTrie) {
    return commonWordsTrie;
  }

  const res = await fetch("/assets/common_words.txt");
  const text = await res.text();
  const words = new Set(
    text
      .split("\n")
      .map((line) => line.trim())
      .map((line) => line.toLowerCase())
  );

  // Get all unique atomic symbols
  const allSymbols = [
    ...new Set(gameData.map((element) => element.atomicSymbol)),
  ];

  commonWordsTrie = new PrecomputedWordChecker(words, allSymbols);
  return commonWordsTrie;
}

// Reset cache for testing (exported for test use only)
export function resetCommonWordsTrieCache(): void {
  commonWordsTrie = null;
}
