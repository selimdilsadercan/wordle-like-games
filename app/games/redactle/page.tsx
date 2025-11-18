"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// Sample Wikipedia article text
const ARTICLE_TEXT = `The quick brown fox jumps over the lazy dog. This is a famous sentence used in typing practice. 
The sentence contains every letter of the alphabet at least once. It is commonly used to test keyboards and fonts.
The phrase has been used since the early twentieth century. It appears in many typing books and computer programs.`;

const COMMON_WORDS = [
  "THE",
  "QUICK",
  "BROWN",
  "FOX",
  "JUMPS",
  "OVER",
  "LAZY",
  "DOG",
  "THIS",
  "IS",
  "A",
  "FAMOUS",
  "SENTENCE",
  "USED",
  "IN",
  "TYPING",
  "PRACTICE",
  "CONTAINS",
  "EVERY",
  "LETTER",
  "OF",
  "ALPHABET",
  "AT",
  "LEAST",
  "ONCE",
  "COMMONLY",
  "TEST",
  "KEYBOARDS",
  "AND",
  "FONTS",
  "PHRASE",
  "HAS",
  "BEEN",
  "SINCE",
  "EARLY",
  "TWENTIETH",
  "CENTURY",
  "APPEARS",
  "MANY",
  "BOOKS",
  "COMPUTER",
  "PROGRAMS",
];

const Redactle = () => {
  const [article, setArticle] = useState(ARTICLE_TEXT);
  const [revealedWords, setRevealedWords] = useState<Set<string>>(new Set());
  const [guessedWords, setGuessedWords] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameState, setGameState] = useState<"playing" | "won">("playing");

  const wordsInArticle = article
    .toUpperCase()
    .split(/\s+/)
    .map((w) => w.replace(/[.,!?;:]/g, ""));

  const handleGuess = () => {
    if (!currentGuess.trim()) return;

    const guess = currentGuess.toUpperCase().trim();
    if (guessedWords.includes(guess)) {
      return;
    }

    setGuessedWords([...guessedWords, guess]);

    // Check if word is in article
    if (wordsInArticle.includes(guess)) {
      setRevealedWords(new Set([...revealedWords, guess]));

      // Check if all words are revealed
      const allWords = new Set(wordsInArticle);
      const allRevealed = Array.from(allWords).every(
        (word) => revealedWords.has(word) || word === guess
      );

      if (allRevealed) {
        setGameState("won");
      }
    }

    setCurrentGuess("");
  };

  const renderArticle = () => {
    return article.split(/\s+/).map((word, idx) => {
      const cleanWord = word.replace(/[.,!?;:]/g, "").toUpperCase();
      const isRevealed =
        revealedWords.has(cleanWord) ||
        cleanWord.length <= 2 || // Reveal short words
        !/[A-Z]/.test(cleanWord); // Reveal punctuation

      if (isRevealed) {
        return (
          <span key={idx} className="text-white">
            {word}{" "}
          </span>
        );
      } else {
        return (
          <span key={idx} className="bg-black text-black select-none">
            {"█".repeat(Math.max(cleanWord.length, 3))}{" "}
          </span>
        );
      }
    });
  };

  const resetGame = () => {
    setRevealedWords(new Set());
    setGuessedWords([]);
    setCurrentGuess("");
    setGameState("playing");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-cyan-800 to-blue-900 flex flex-col items-center justify-center p-4">
      <Link
        href="/"
        className="absolute top-4 left-4 text-white hover:text-blue-300 transition-colors"
      >
        ← Back to Games
      </Link>

      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold text-white text-center mb-2">
          REDACTLE
        </h1>
        <p className="text-center text-blue-200 mb-6">
          Uncover the hidden article by guessing words
        </p>

        {gameState === "won" && (
          <div className="text-center mb-4 p-4 bg-green-500/30 rounded text-white text-xl font-bold">
            Congratulations! You revealed the entire article!
          </div>
        )}

        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={currentGuess}
              onChange={(e) => setCurrentGuess(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleGuess()}
              placeholder="Guess a word..."
              disabled={gameState === "won"}
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/50 border-2 border-blue-400 focus:outline-none focus:border-blue-300"
            />
            <button
              onClick={handleGuess}
              disabled={gameState === "won"}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-semibold disabled:opacity-50"
            >
              Guess
            </button>
          </div>
        </div>

        <div className="bg-black/30 p-6 rounded-lg mb-6 min-h-[200px] text-lg leading-relaxed">
          {renderArticle()}
        </div>

        <div className="mb-4">
          <h3 className="text-white font-semibold mb-2">
            Guessed Words ({guessedWords.length}):
          </h3>
          <div className="flex flex-wrap gap-2">
            {guessedWords.map((word, idx) => {
              const isInArticle = wordsInArticle.includes(word);
              return (
                <span
                  key={idx}
                  className={`px-3 py-1 rounded ${
                    isInArticle
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {word} {isInArticle ? "✓" : "✗"}
                </span>
              );
            })}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={resetGame}
            className="px-6 py-2 bg-white text-blue-800 font-bold rounded-lg hover:bg-blue-100 transition-colors"
          >
            New Article
          </button>
        </div>
      </div>
    </div>
  );
};

export default Redactle;
