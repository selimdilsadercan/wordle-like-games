"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// Word similarity data (simplified - in real game, this would use semantic similarity)
const WORD_SIMILARITY: Record<string, number> = {
  APPLE: 100,
  FRUIT: 85,
  RED: 60,
  TREE: 70,
  ORANGE: 75,
  OCEAN: 100,
  WATER: 90,
  BLUE: 70,
  SEA: 95,
  WAVE: 80,
  MUSIC: 100,
  SOUND: 85,
  SONG: 90,
  MELODY: 88,
  INSTRUMENT: 75,
  BOOK: 100,
  READ: 85,
  PAGE: 80,
  STORY: 75,
  LIBRARY: 70,
  SUN: 100,
  LIGHT: 85,
  DAY: 80,
  STAR: 60,
  HEAT: 75,
};

const TARGET_WORDS = ["APPLE", "OCEAN", "MUSIC", "BOOK", "SUN"];

interface Guess {
  word: string;
  similarity: number;
}

const Contexto = () => {
  const [targetWord, setTargetWord] = useState("");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">(
    "playing"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const randomWord =
      TARGET_WORDS[Math.floor(Math.random() * TARGET_WORDS.length)];
    setTargetWord(randomWord);
  }, []);

  const getSimilarity = useCallback(
    (guess: string): number => {
      const key = `${targetWord}_${guess.toUpperCase()}`;
      return (
        WORD_SIMILARITY[key] ||
        WORD_SIMILARITY[guess.toUpperCase()] ||
        Math.floor(Math.random() * 40) + 10
      ); // Random similarity for unknown words
    },
    [targetWord]
  );

  const handleGuess = useCallback(() => {
    if (!currentGuess.trim()) return;

    const similarity = getSimilarity(currentGuess);
    const newGuess: Guess = { word: currentGuess.toUpperCase(), similarity };

    setGuesses((prevGuesses) => {
      const updated = [...prevGuesses, newGuess].sort(
        (a, b) => b.similarity - a.similarity
      );

      if (similarity === 100) {
        setGameState("won");
        setMessage("Congratulations! You found the word!");
      } else if (prevGuesses.length >= 9) {
        setGameState("lost");
        setMessage(`Game Over! The word was ${targetWord}`);
      }

      return updated;
    });

    setCurrentGuess("");
  }, [currentGuess, targetWord, getSimilarity]);

  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && gameState === "playing") {
        handleGuess();
      }
    },
    [gameState, handleGuess]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 90) return "bg-green-500";
    if (similarity >= 70) return "bg-yellow-500";
    if (similarity >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  const resetGame = () => {
    const randomWord =
      TARGET_WORDS[Math.floor(Math.random() * TARGET_WORDS.length)];
    setTargetWord(randomWord);
    setGuesses([]);
    setCurrentGuess("");
    setGameState("playing");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-purple-900 flex flex-col items-center justify-center p-4">
      <Link
        href="/"
        className="absolute top-4 left-4 text-white hover:text-purple-300 transition-colors"
      >
        ← Back to Games
      </Link>

      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-white text-center mb-2">
          CONTEXTO
        </h1>
        <p className="text-center text-purple-200 mb-6">
          Guess the word by context similarity
        </p>

        {message && (
          <div className="text-center mb-4 p-2 bg-white/20 rounded text-white">
            {message}
          </div>
        )}

        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={currentGuess}
              onChange={(e) => setCurrentGuess(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleGuess()}
              placeholder="Enter your guess..."
              disabled={gameState !== "playing"}
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/50 border-2 border-purple-400 focus:outline-none focus:border-purple-300"
            />
            <button
              onClick={handleGuess}
              disabled={gameState !== "playing"}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors font-semibold disabled:opacity-50"
            >
              Guess
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {guesses.map((guess, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 p-3 bg-white/10 rounded-lg"
            >
              <div
                className={`w-16 h-16 ${getSimilarityColor(
                  guess.similarity
                )} rounded-lg flex items-center justify-center text-white font-bold text-lg`}
              >
                {guess.similarity}%
              </div>
              <div className="flex-1 text-white text-xl font-semibold">
                {guess.word}
              </div>
            </div>
          ))}
        </div>

        {guesses.length === 0 && (
          <div className="text-center text-purple-300 mt-8">
            Start guessing! Words closer to the target will have higher
            similarity scores.
          </div>
        )}

        {gameState !== "playing" && (
          <div className="text-center mt-6">
            <button
              onClick={resetGame}
              className="px-6 py-2 bg-white text-purple-800 font-bold rounded-lg hover:bg-purple-100 transition-colors"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contexto;
