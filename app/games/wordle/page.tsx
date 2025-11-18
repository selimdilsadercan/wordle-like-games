"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// Common 5-letter words
const WORDS = [
  "APPLE",
  "BEACH",
  "CHAIR",
  "DANCE",
  "EARTH",
  "FLAME",
  "GLASS",
  "HEART",
  "IMAGE",
  "JOKER",
  "KNIFE",
  "LEMON",
  "MUSIC",
  "NIGHT",
  "OCEAN",
  "PEACE",
  "QUICK",
  "RIVER",
  "STONE",
  "TIGER",
  "UNITY",
  "VALUE",
  "WATER",
  "YOUTH",
  "ZEBRA",
  "BRAVE",
  "CLOUD",
  "DREAM",
  "EAGLE",
  "FROST",
  "GREEN",
  "HAPPY",
];

type LetterState = "correct" | "present" | "absent" | "empty";

interface Letter {
  letter: string;
  state: LetterState;
}

const Wordle = () => {
  const [targetWord, setTargetWord] = useState("");
  const [guesses, setGuesses] = useState<Letter[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">(
    "playing"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Pick a random word
    const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    setTargetWord(randomWord);
  }, []);

  const evaluateGuess = (guess: string): Letter[] => {
    const result: Letter[] = [];
    const targetArray = targetWord.split("");
    const guessArray = guess.split("");
    const used = new Array(5).fill(false);

    // First pass: mark correct positions
    for (let i = 0; i < 5; i++) {
      if (guessArray[i] === targetArray[i]) {
        result.push({ letter: guessArray[i], state: "correct" });
        used[i] = true;
      } else {
        result.push({ letter: "", state: "empty" });
      }
    }

    // Second pass: mark present letters
    for (let i = 0; i < 5; i++) {
      if (result[i].state === "empty") {
        const letter = guessArray[i];
        const index = targetArray.findIndex(
          (char, idx) => char === letter && !used[idx]
        );
        if (index !== -1) {
          result[i] = { letter, state: "present" };
          used[index] = true;
        } else {
          result[i] = { letter, state: "absent" };
        }
      }
    }

    return result;
  };

  const handleKeyPress = useCallback(
    (key: string) => {
      if (gameState !== "playing") return;

      if (key === "Enter") {
        if (currentGuess.length === 5) {
          if (WORDS.includes(currentGuess)) {
            const evaluated = evaluateGuess(currentGuess);
            setGuesses([...guesses, evaluated]);

            if (currentGuess === targetWord) {
              setGameState("won");
              setMessage("Congratulations! You won!");
            } else if (guesses.length === 5) {
              setGameState("lost");
              setMessage(`Game Over! The word was ${targetWord}`);
            } else {
              setCurrentGuess("");
            }
          } else {
            setMessage("Not a valid word!");
            setTimeout(() => setMessage(""), 2000);
          }
        }
      } else if (key === "Backspace") {
        setCurrentGuess(currentGuess.slice(0, -1));
      } else if (
        key.length === 1 &&
        /[A-Za-z]/.test(key) &&
        currentGuess.length < 5
      ) {
        setCurrentGuess((prev) => (prev + key.toUpperCase()).slice(0, 5));
      }
    },
    [currentGuess, guesses, targetWord, gameState]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handleKeyPress(e.key);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyPress]);

  const getLetterColor = (state: LetterState) => {
    switch (state) {
      case "correct":
        return "bg-green-500";
      case "present":
        return "bg-yellow-500";
      case "absent":
        return "bg-gray-600";
      default:
        return "bg-gray-800 border-2 border-gray-600";
    }
  };

  const resetGame = () => {
    const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    setTargetWord(randomWord);
    setGuesses([]);
    setCurrentGuess("");
    setGameState("playing");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-green-900 flex flex-col items-center justify-center p-4">
      <Link
        href="/"
        className="absolute top-4 left-4 text-white hover:text-green-300 transition-colors"
      >
        ← Back to Games
      </Link>

      <div className="max-w-md w-full">
        <h1 className="text-4xl font-bold text-white text-center mb-2">
          WORDLE
        </h1>
        <p className="text-center text-green-200 mb-6">
          Guess the 5-letter word
        </p>

        {message && (
          <div className="text-center mb-4 p-2 bg-white/20 rounded text-white">
            {message}
          </div>
        )}

        <div className="space-y-2 mb-8">
          {[...Array(6)].map((_, row) => {
            const guess = guesses[row] || [];
            const isCurrentRow = row === guesses.length;

            return (
              <div key={row} className="flex gap-2">
                {[...Array(5)].map((_, col) => {
                  if (isCurrentRow) {
                    const letter = currentGuess[col] || "";
                    return (
                      <div
                        key={col}
                        className="flex-1 aspect-square bg-gray-800 border-2 border-gray-600 rounded flex items-center justify-center text-white text-2xl font-bold"
                      >
                        {letter}
                      </div>
                    );
                  } else {
                    const letterData = guess[col] || {
                      letter: "",
                      state: "empty",
                    };
                    return (
                      <div
                        key={col}
                        className={`flex-1 aspect-square ${getLetterColor(
                          letterData.state
                        )} rounded flex items-center justify-center text-white text-2xl font-bold`}
                      >
                        {letterData.letter}
                      </div>
                    );
                  }
                })}
              </div>
            );
          })}
        </div>

        {gameState !== "playing" && (
          <div className="text-center mb-4">
            <button
              onClick={resetGame}
              className="px-6 py-2 bg-white text-green-800 font-bold rounded-lg hover:bg-green-100 transition-colors"
            >
              Play Again
            </button>
          </div>
        )}

        <div className="grid grid-cols-10 gap-1">
          {[
            "Q",
            "W",
            "E",
            "R",
            "T",
            "Y",
            "U",
            "I",
            "O",
            "P",
            "A",
            "S",
            "D",
            "F",
            "G",
            "H",
            "J",
            "K",
            "L",
            "Z",
            "X",
            "C",
            "V",
            "B",
            "N",
            "M",
          ].map((key) => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              className="py-2 px-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm font-semibold"
            >
              {key}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-1">
          <button
            onClick={() => handleKeyPress("Enter")}
            className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors font-semibold"
          >
            ENTER
          </button>
          <button
            onClick={() => handleKeyPress("Backspace")}
            className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition-colors font-semibold"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
};

export default Wordle;
