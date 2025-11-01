import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PrecomputedWordChecker,
  loadCommonWordsTrie,
  resetCommonWordsTrieCache,
} from "./wordTrie";

describe("PrecomputedWordChecker", () => {
  describe("Constructor", () => {
    it("should initialize with valid words and symbols", () => {
      const words = new Set(["house", "beach", "chair"]);
      const symbols = ["H", "O", "U", "S", "E", "B", "A", "C", "R", "I"];
      const checker = new PrecomputedWordChecker(words, symbols);

      expect(checker).toBeInstanceOf(PrecomputedWordChecker);
    });

    it("should handle empty word set", () => {
      const words = new Set<string>([]);
      const symbols = ["H", "O"];
      const checker = new PrecomputedWordChecker(words, symbols);

      expect(checker.findFirstWord(["H", "O"])).toBeNull();
    });

    it("should handle empty symbols array", () => {
      const words = new Set(["house"]);
      const symbols: string[] = [];
      const checker = new PrecomputedWordChecker(words, symbols);

      expect(checker.findFirstWord(["H"])).toBeNull();
    });
  });

  describe("findFirstWord - Basic functionality", () => {
    it("should find a word when symbols match exactly", () => {
      const words = new Set(["house"]);
      const symbols = ["H", "O", "U", "S", "E"];
      const checker = new PrecomputedWordChecker(words, symbols);

      const result = checker.findFirstWord(["H", "O", "U", "S", "E"]);
      expect(result).toBe("house");
    });

    it("should return null when no word can be spelled", () => {
      const words = new Set(["house"]);
      const symbols = ["H", "O", "U", "S", "E"];
      const checker = new PrecomputedWordChecker(words, symbols);

      const result = checker.findFirstWord(["X", "Y", "Z"]);
      expect(result).toBeNull();
    });

    it("should return null for empty symbols array", () => {
      const words = new Set(["house"]);
      const symbols = ["H", "O", "U", "S", "E"];
      const checker = new PrecomputedWordChecker(words, symbols);

      const result = checker.findFirstWord([]);
      expect(result).toBeNull();
    });
  });

  describe("findFirstWord - Case sensitivity", () => {
    it("should be case insensitive for input symbols", () => {
      const words = new Set(["house"]);
      const symbols = ["H", "O", "U", "S", "E"];
      const checker = new PrecomputedWordChecker(words, symbols);

      expect(checker.findFirstWord(["h", "o", "u", "s", "e"])).toBe("house");
      expect(checker.findFirstWord(["H", "O", "U", "S", "E"])).toBe("house");
      expect(checker.findFirstWord(["H", "o", "U", "s", "E"])).toBe("house");
    });

    it("should handle case insensitive word matching", () => {
      const words = new Set(["HOUSE", "house", "House"]);
      const symbols = ["H", "O", "U", "S", "E"];
      const checker = new PrecomputedWordChecker(words, symbols);

      const result = checker.findFirstWord(["H", "O", "U", "S", "E"]);
      expect(result).toBe("house"); // Should normalize to lowercase
    });
  });

  describe("findFirstWord - Minimum symbols requirement", () => {
    it("should respect minimum symbols parameter (default 3)", () => {
      const words = new Set(["hi", "bye", "hello"]);
      const symbols = ["H", "I", "B", "Y", "E", "L", "O"];
      const checker = new PrecomputedWordChecker(words, symbols);

      // "hi" has only 2 symbols, so shouldn't be found with default min of 3
      const result = checker.findFirstWord(["H", "I"]);
      expect(result).toBeNull();
    });

    it("should find words when minimum symbols requirement is met", () => {
      const words = new Set(["hello"]);
      const symbols = ["H", "E", "L", "O"];
      const checker = new PrecomputedWordChecker(words, symbols);

      const result = checker.findFirstWord(["H", "E", "L", "L", "O"], 3);
      expect(result).toBe("hello");
    });

    it("should allow custom minimum symbols requirement", () => {
      const words = new Set(["hi", "hello"]);
      const symbols = ["H", "I", "E", "L", "O"];
      const checker = new PrecomputedWordChecker(words, symbols);

      // With minSymbols=2, should find "hi"
      const result = checker.findFirstWord(["H", "I"], 2);
      expect(result).toBe("hi");
    });
  });

  describe("findFirstWord - Multiple words and shortest word selection", () => {
    it("should find the shortest word when multiple words are possible", () => {
      const words = new Set(["cat", "cats", "catch", "catching"]);
      const symbols = ["C", "A", "T", "S", "H", "I", "N", "G"];
      const checker = new PrecomputedWordChecker(words, symbols);

      const result = checker.findFirstWord([
        "C",
        "A",
        "T",
        "S",
        "H",
        "I",
        "N",
        "G",
      ]);
      expect(result).toBe("cat"); // Shortest word
    });

    it("should find first word that meets minimum requirement", () => {
      const words = new Set(["beach", "beaches", "beached"]);
      const symbols = ["B", "E", "A", "C", "H", "S", "D"];
      const checker = new PrecomputedWordChecker(words, symbols);

      const result = checker.findFirstWord(["B", "E", "A", "C", "H", "S"], 3);
      expect(result).toBe("beach"); // Shortest that meets minimum
    });
  });

  describe("findFirstWord - Symbol reuse", () => {
    it("should handle symbols that appear multiple times in a word", () => {
      const words = new Set(["hello"]);
      const symbols = ["H", "E", "L", "O"];
      const checker = new PrecomputedWordChecker(words, symbols);

      const result = checker.findFirstWord(["H", "E", "L", "L", "O"]);
      expect(result).toBe("hello");
    });

    it("should not reuse symbols beyond available count", () => {
      const words = new Set(["hello"]);
      const symbols = ["H", "E", "L", "O"];
      const checker = new PrecomputedWordChecker(words, symbols);

      // Only one L available, but "hello" needs two
      const result = checker.findFirstWord(["H", "E", "L", "O"]);
      expect(result).toBeNull();
    });

    it("should handle duplicate symbols correctly", () => {
      const words = new Set(["book"]);
      const symbols = ["B", "O", "K"];
      const checker = new PrecomputedWordChecker(words, symbols);

      // "book" needs two O's
      const result1 = checker.findFirstWord(["B", "O", "O", "K"]);
      expect(result1).toBe("book");

      // Only one O available
      const result2 = checker.findFirstWord(["B", "O", "K"]);
      expect(result2).toBeNull();
    });
  });

  describe("findFirstWord - Multi-character atomic symbols", () => {
    it("should handle single-character symbols", () => {
      const words = new Set(["house"]);
      const symbols = ["H", "O", "U", "S", "E"];
      const checker = new PrecomputedWordChecker(words, symbols);

      const result = checker.findFirstWord(["H", "O", "U", "S", "E"]);
      expect(result).toBe("house");
    });

    it("should handle multi-character symbols like 'He', 'Li', etc.", () => {
      const words = new Set(["heline"]);
      const symbols = ["H", "E", "He", "Li", "Ne"];
      const checker = new PrecomputedWordChecker(words, symbols);

      // Can spell "heline" using "He" + "Li" + "Ne"
      const result = checker.findFirstWord(["He", "Li", "Ne"]);
      expect(result).toBe("heline");
    });

    it("should prefer single-character symbols when both are available", () => {
      const words = new Set(["hello"]);
      const symbols = ["H", "E", "L", "O", "He", "Li"];
      const checker = new PrecomputedWordChecker(words, symbols);

      // Should use H, E, L, L, O to spell "hello"
      const result = checker.findFirstWord(["H", "E", "L", "L", "O"]);
      expect(result).toBe("hello");
    });

    it("should handle mixed single and multi-character symbols", () => {
      const words = new Set(["choice"]);
      const symbols = ["C", "H", "O", "I", "Ce"];
      const checker = new PrecomputedWordChecker(words, symbols);

      // Can spell "choice" using "C" + "H" + "O" + "I" + "Ce"
      const result = checker.findFirstWord(["C", "H", "O", "I", "Ce"]);
      expect(result).toBe("choice");
    });

    it("should handle words requiring multi-character symbols", () => {
      const words = new Set(["helium"]);
      const symbols = ["He", "Li", "U", "M"];
      const checker = new PrecomputedWordChecker(words, symbols);

      // Can spell "helium" using "He" + "Li" + "U" + "M"
      const result = checker.findFirstWord(["He", "Li", "U", "M"]);
      expect(result).toBe("helium");
    });
  });

  describe("findFirstWord - Complex scenarios", () => {
    it("should handle words with overlapping symbol possibilities", () => {
      const words = new Set(["cat", "cats"]);
      const symbols = ["C", "A", "T", "S", "Ca", "At"];
      const checker = new PrecomputedWordChecker(words, symbols);

      // Should find shortest word
      const result = checker.findFirstWord(["C", "A", "T", "S"]);
      expect(result).toBe("cat");
    });

    it("should handle multiple valid paths through the trie", () => {
      const words = new Set(["beat", "beats", "beaten"]);
      const symbols = ["B", "E", "A", "T", "S", "N"];
      const checker = new PrecomputedWordChecker(words, symbols);

      const result = checker.findFirstWord(["B", "E", "A", "T", "S", "N"]);
      expect(result).toBe("beat"); // Shortest
    });

    it("should not find words when symbols don't match any path", () => {
      const words = new Set(["house", "beach"]);
      const symbols = ["H", "O", "U", "S", "E", "B", "A", "C"];
      const checker = new PrecomputedWordChecker(words, symbols);

      const result = checker.findFirstWord(["X", "Y", "Z"]);
      expect(result).toBeNull();
    });
  });

  describe("findFirstWord - Edge cases", () => {
    it("should handle very long words", () => {
      const longWord = "abcdefghijklmnopqrstuvwxyz";
      const words = new Set([longWord]);
      const symbols = longWord.split("").map((c) => c.toUpperCase());
      const checker = new PrecomputedWordChecker(words, symbols);

      const result = checker.findFirstWord(symbols);
      expect(result).toBe(longWord);
    });

    it("should handle words with same starting letters", () => {
      const words = new Set(["cat", "cats", "catch", "category"]);
      const symbols = ["C", "A", "T", "S", "H", "E", "G", "O", "R", "Y"];
      const checker = new PrecomputedWordChecker(words, symbols);

      // Should find shortest
      const result = checker.findFirstWord([
        "C",
        "A",
        "T",
        "S",
        "H",
        "E",
        "G",
        "O",
        "R",
        "Y",
      ]);
      expect(result).toBe("cat");
    });

    it("should handle empty result when symbols match prefix but not complete word", () => {
      const words = new Set(["hello"]);
      const symbols = ["H", "E", "L", "O"];
      const checker = new PrecomputedWordChecker(words, symbols);

      // Only have H, E, L (prefix of hello but not complete)
      const result = checker.findFirstWord(["H", "E", "L"]);
      expect(result).toBeNull();
    });
  });

  describe("findFirstWord - Real chemistry examples", () => {
    it("should work with realistic atomic symbol combinations", () => {
      const words = new Set(["beach"]);
      const symbols = ["B", "E", "A", "C", "H", "Be", "At"];
      const checker = new PrecomputedWordChecker(words, symbols);

      const result = checker.findFirstWord(["B", "E", "A", "C", "H"]);
      expect(result).toBe("beach");
    });

    it("should handle periodic table element symbols", () => {
      const words = new Set(["science"]);
      const symbols = ["S", "C", "I", "E", "N", "Sc", "Ce"];
      const checker = new PrecomputedWordChecker(words, symbols);

      // Can spell "science" using "S" + "C" + "I" + "E" + "N" + "Ce"
      const result = checker.findFirstWord(["S", "C", "I", "E", "N", "Ce"]);
      expect(result).toBe("science");
    });
  });
});

describe("loadCommonWordsTrie", () => {
  beforeEach(() => {
    // Clear the module-level cache between tests
    resetCommonWordsTrieCache();
    vi.clearAllMocks();
  });

  it("should load and return a PrecomputedWordChecker instance", async () => {
    // Mock the fetch to return a simple word list
    // Using words that can be spelled with actual atomic symbols:
    // "hocus" = H, O, C, U, S (all exist)
    // "chops" = C, H, O, P, S (all exist)
    global.fetch = vi.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve("hocus\nchops\n"),
      } as Response)
    );

    const trie = await loadCommonWordsTrie();
    expect(trie).toBeInstanceOf(PrecomputedWordChecker);

    // Should find words using actual atomic symbols
    expect(trie.findFirstWord(["H", "O", "C", "U", "S"])).toBe("hocus");
  });

  it("should filter words to at least 3 characters", async () => {
    // Using words that can be spelled with actual atomic symbols
    global.fetch = vi.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve("hi\nbye\nhocus\nchops\n"),
      } as Response)
    );

    const trie = await loadCommonWordsTrie();

    // Should not find "hi" (too short), but should find longer words
    expect(trie.findFirstWord(["H", "I"])).toBeNull();

    // Should find words with 3+ characters using valid atomic symbols
    expect(trie.findFirstWord(["B", "Y", "E"])).toBeNull();
    expect(trie.findFirstWord(["H", "O", "C", "U", "S"])).toBe("hocus");
    expect(trie.findFirstWord(["C", "H", "O", "P", "S"])).toBe("chops");
  });

  it("should normalize words to lowercase", async () => {
    // Using words that can be spelled with actual atomic symbols
    global.fetch = vi.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve("HOCUS\nChops\n"),
      } as Response)
    );

    const trie = await loadCommonWordsTrie();

    // Should find words regardless of original case (normalized to lowercase)
    expect(trie.findFirstWord(["H", "O", "C", "U", "S"])).toBe("hocus");
    expect(trie.findFirstWord(["C", "H", "O", "P", "S"])).toBe("chops");
  });

  it("should cache the trie and return same instance on subsequent calls", async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve("hocus\nchops\n"),
      } as Response)
    );
    global.fetch = mockFetch;

    const trie1 = await loadCommonWordsTrie();
    const trie2 = await loadCommonWordsTrie();

    expect(trie1).toBe(trie2);
    // Fetch should only be called once due to caching
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should handle empty file gracefully", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve(""),
      } as Response)
    );

    const trie = await loadCommonWordsTrie();
    expect(trie).toBeInstanceOf(PrecomputedWordChecker);
    expect(trie.findFirstWord(["H", "O"])).toBeNull();
  });

  it("should handle file with only whitespace", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve("   \n\n  \n"),
      } as Response)
    );

    const trie = await loadCommonWordsTrie();
    expect(trie).toBeInstanceOf(PrecomputedWordChecker);
  });

  it("should trim whitespace from words", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve("  hocus  \n  chops  \n"),
      } as Response)
    );

    const trie = await loadCommonWordsTrie();
    // The words should be in the trie after trimming
    expect(trie.findFirstWord(["H", "O", "C", "U", "S"])).toBe("hocus");
    expect(trie.findFirstWord(["C", "H", "O", "P", "S"])).toBe("chops");
  });
});
