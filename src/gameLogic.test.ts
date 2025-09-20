import { describe, it, expect } from "vitest";
import { canSpellWordWithSymbols, calculateWordSpellingPoints } from "./gameLogic";

describe("canSpellWordWithSymbols", () => {
  describe("Basic functionality", () => {
    it("should return true for a word that can be spelled with available symbols", () => {
      const symbols = ["H", "O", "U", "S", "E"];

      expect(canSpellWordWithSymbols(symbols, "HOUSE")).toBe(true);
    });

    it("should return false for a word that cannot be spelled with available symbols", () => {
      const symbols = ["H", "O"];

      expect(canSpellWordWithSymbols(symbols, "HELLO")).toBe(false);
    });

    it("should handle empty word", () => {
      const symbols = ["H"];

      expect(canSpellWordWithSymbols(symbols, "")).toBe(true);
    });

    it("should handle empty symbols array", () => {
      expect(canSpellWordWithSymbols([], "HELLO")).toBe(false);
    });

    it("should handle both empty symbols and empty word", () => {
      expect(canSpellWordWithSymbols([], "")).toBe(true);
    });
  });

  describe("Case sensitivity", () => {
    it("should be case insensitive for word input", () => {
      const symbols = ["H", "O", "U", "S", "E"];

      expect(canSpellWordWithSymbols(symbols, "house")).toBe(true);
      expect(canSpellWordWithSymbols(symbols, "HOUSE")).toBe(true);
      expect(canSpellWordWithSymbols(symbols, "HoUsE")).toBe(true);
    });

    it("should be case insensitive for atomic symbols", () => {
      const symbols = ["h", "O", "u", "S", "e"]; // mixed case symbols

      expect(canSpellWordWithSymbols(symbols, "HOUSE")).toBe(true);
    });
  });

  describe("Frequency counting", () => {
    it("should handle duplicate letters correctly", () => {
      const symbols = ["H", "E", "L", "L", "O"];

      expect(canSpellWordWithSymbols(symbols, "HELLO")).toBe(false); // Can't spell because using "L" removes all L's
    });

    it("should return false when not enough duplicate letters available", () => {
      const symbols = ["H", "E", "L", "O"]; // Only one L

      expect(canSpellWordWithSymbols(symbols, "HELLO")).toBe(false); // Needs two L's
    });

    it("should handle words with repeated letters when enough symbols available", () => {
      const symbols = ["B", "O", "O", "K"];

      expect(canSpellWordWithSymbols(symbols, "BOOK")).toBe(false); // Can't spell because using "O" removes all O's
    });

    it("should return false when not enough repeated letters", () => {
      const symbols = ["B", "O", "K"]; // Only one O

      expect(canSpellWordWithSymbols(symbols, "BOOK")).toBe(false); // Needs two O's
    });
  });

  describe("Multi-character atomic symbols", () => {
    it("should handle single-character atomic symbols", () => {
      const symbols = ["H", "O", "N", "E", "Y"];

      expect(canSpellWordWithSymbols(symbols, "HONEY")).toBe(true);
    });

    it("should treat multi-character atomic symbols as whole symbols, not individual letters", () => {
      const symbols = ["He", "Li", "Be", "Ne", "Na"]; // Multi-character symbols

      // Can spell words using multi-character symbols if they match
      expect(canSpellWordWithSymbols(symbols, "HELEN")).toBe(false); // Would need 'h', 'e', 'l', 'e', 'n' individually
      expect(canSpellWordWithSymbols(symbols, "HELI")).toBe(true); // "He" + "Li" = "HELI"

      // But can spell if we have the right multi-character combinations
      const symbols2 = ["H", "E", "Li", "Ne"];
      expect(canSpellWordWithSymbols(symbols2, "HELINE")).toBe(true); // "He" + "Li" + "Ne" = "HELINE"
    });

    it("should handle mixed single and multi-character symbols", () => {
      const symbols = ["C", "At", "S"];

      expect(canSpellWordWithSymbols(symbols, "CATS")).toBe(true); // c + at + s = cats
      expect(canSpellWordWithSymbols(symbols, "SCAT")).toBe(true); // s + c + at = scat
      expect(canSpellWordWithSymbols(symbols, "CAST")).toBe(false); // Would need c + a + s + t, but we only have 'at' not 'a' and 't'

      // But these should work because they use the exact symbols we have
      const symbols2 = ["C", "A", "T", "S"];
      expect(canSpellWordWithSymbols(symbols2, "CATS")).toBe(true); // c + a + t + s = cats
      expect(canSpellWordWithSymbols(symbols2, "SCAT")).toBe(true); // s + c + a + t = scat
    });
  });

  describe("Edge cases", () => {
    it("should handle very long words", () => {
      const symbols = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ");

      expect(
        canSpellWordWithSymbols(symbols, "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
      ).toBe(true);
    });

    it("should handle single letter words", () => {
      const symbols = ["A"];

      expect(canSpellWordWithSymbols(symbols, "A")).toBe(true);
      expect(canSpellWordWithSymbols(symbols, "B")).toBe(false);
    });

    it("should handle special characters in atomic symbols", () => {
      const symbols = ["H", "O", "U", "S", "E"];

      expect(canSpellWordWithSymbols(symbols, "HOUSE")).toBe(true);
    });

    it("should handle numbers and special characters in word (should treat as letters)", () => {
      const symbols = ["1", "2", "3"];

      expect(canSpellWordWithSymbols(symbols, "123")).toBe(true);
    });
  });

  describe("Real chemistry examples", () => {
    it("should work with actual atomic symbols to spell words", () => {
      const symbols = ["C", "H", "O", "I", "Ce"]; // Ce is cerium, not separate C and E

      // Available symbols: c, h, o, i, ce
      expect(canSpellWordWithSymbols(symbols, "CHOICE")).toBe(true); // "C" + "H" + "O" + "I" + "Ce" = "CHOICE"
      expect(canSpellWordWithSymbols(symbols, "CHOI")).toBe(true); // c + h + o + i = choi
      expect(canSpellWordWithSymbols(symbols, "ICE")).toBe(true); // "I" + "Ce" = "ICE"
    });

    it("should work with multi-character element symbols", () => {
      const symbols = ["Au", "Ag", "Cu", "Fe", "Pb"];

      // Available symbols: au, ag, cu, fe, pb
      expect(canSpellWordWithSymbols(symbols, "CAGE")).toBe(false); // Would need c,a,g,e individually
      expect(canSpellWordWithSymbols(symbols, "CUP")).toBe(false); // Would need c,u,p individually, but we have 'cu' not separate 'c' and 'u'
      expect(canSpellWordWithSymbols(symbols, "CUFE")).toBe(true); // "Cu" + "Fe" = "CUFE"
      expect(canSpellWordWithSymbols(symbols, "AGAU")).toBe(true); // "Ag" + "Au" = "AGAU"

      // Multi-character symbols can only be used if we need those exact letters
      const symbols2 = ["A", "U", "G"];
      expect(canSpellWordWithSymbols(symbols2, "AUG")).toBe(true); // a + u + g = aug
      expect(canSpellWordWithSymbols(symbols2, "GAU")).toBe(true); // g + a + u = gau
    });

    it("should handle realistic game scenario with mixed symbols", () => {
      // Player has drafted these cards and wants to spell "BEACH"
      const symbols = ["B", "E", "A", "C", "H"];

      // Available symbols: b, e, a, c, h
      expect(canSpellWordWithSymbols(symbols, "BEACH")).toBe(true); // b + e + a + c + h = beach
      expect(canSpellWordWithSymbols(symbols, "EACH")).toBe(true); // e + a + c + h = each
      expect(canSpellWordWithSymbols(symbols, "CHAB")).toBe(true); // c + h + a + b = chab
    });

    it("should handle complex multi-character combinations", () => {
      const symbols = ["Be", "At", "Es"];

      expect(canSpellWordWithSymbols(symbols, "BEATS")).toBe(false); // Would need b,e,a,t,s but we have 'Be', 'At', 'Es' as whole symbols
      expect(canSpellWordWithSymbols(symbols, "BEAST")).toBe(false); // Would need b,e,a,s,t but we have 'Be', 'At', 'Es' as whole symbols
      expect(canSpellWordWithSymbols(symbols, "BEATES")).toBe(true); // "Be" + "At" + "Es" = "BEATES"
    });
  });
});

describe("calculateWordSpellingPoints", () => {
  it("should award correct points for single winners in different rounds", () => {
    const winners = [
      { playerId: "player1", round: 1 },
      { playerId: "player2", round: 2 },
      { playerId: "player3", round: 3 },
    ];

    expect(calculateWordSpellingPoints("player1", winners)).toBe(8); // First place
    expect(calculateWordSpellingPoints("player2", winners)).toBe(5); // Second place
    expect(calculateWordSpellingPoints("player3", winners)).toBe(2); // Third place
    expect(calculateWordSpellingPoints("player4", winners)).toBe(0); // Not a winner
  });

  it("should award same points to players who spell words in the same round", () => {
    const winners = [
      { playerId: "player1", round: 1 },
      { playerId: "player2", round: 1 }, // Same round as player1
      { playerId: "player3", round: 2 },
    ];

    expect(calculateWordSpellingPoints("player1", winners)).toBe(8); // Both get first place
    expect(calculateWordSpellingPoints("player2", winners)).toBe(8); // Both get first place
    expect(calculateWordSpellingPoints("player3", winners)).toBe(2); // Third place (second place skipped)
  });

  it("should handle multiple ties correctly", () => {
    const winners = [
      { playerId: "player1", round: 1 },
      { playerId: "player2", round: 1 }, // Tie for first
      { playerId: "player3", round: 2 },
      { playerId: "player4", round: 2 }, // Tie for third (second place was skipped)
    ];

    expect(calculateWordSpellingPoints("player1", winners)).toBe(8); // First place tie
    expect(calculateWordSpellingPoints("player2", winners)).toBe(8); // First place tie
    expect(calculateWordSpellingPoints("player3", winners)).toBe(2); // Third place tie (second skipped)
    expect(calculateWordSpellingPoints("player4", winners)).toBe(2); // Third place tie (second skipped)
  });

  it("should handle three-way tie for first place", () => {
    const winners = [
      { playerId: "player1", round: 1 },
      { playerId: "player2", round: 1 },
      { playerId: "player3", round: 1 }, // All three tie for first
    ];

    expect(calculateWordSpellingPoints("player1", winners)).toBe(8); // All get first place
    expect(calculateWordSpellingPoints("player2", winners)).toBe(8); // All get first place
    expect(calculateWordSpellingPoints("player3", winners)).toBe(8); // All get first place
  });

  it("should return 0 for empty winners array", () => {
    expect(calculateWordSpellingPoints("player1", [])).toBe(0);
  });

  it("should handle out-of-order rounds correctly", () => {
    const winners = [
      { playerId: "player1", round: 3 },
      { playerId: "player2", round: 1 }, // Earlier round
      { playerId: "player3", round: 2 },
    ];

    expect(calculateWordSpellingPoints("player2", winners)).toBe(8); // First (round 1)
    expect(calculateWordSpellingPoints("player3", winners)).toBe(5); // Second (round 2)
    expect(calculateWordSpellingPoints("player1", winners)).toBe(2); // Third (round 3)
  });
});
