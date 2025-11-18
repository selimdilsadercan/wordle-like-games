"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// Valid equations (format: NUMBER OPERATOR NUMBER = RESULT)
const EQUATIONS = [
  { equation: "3+5=8", display: "3 + 5 = 8" },
  { equation: "10-4=6", display: "10 - 4 = 6" },
  { equation: "2*6=12", display: "2 × 6 = 12" },
  { equation: "15/3=5", display: "15 ÷ 3 = 5" },
  { equation: "7+8=15", display: "7 + 8 = 15" },
  { equation: "20-7=13", display: "20 - 7 = 13" },
  { equation: "4*5=20", display: "4 × 5 = 20" },
  { equation: "18/2=9", display: "18 ÷ 2 = 9" },
  { equation: "6+9=15", display: "6 + 9 = 15" },
  { equation: "12-5=7", display: "12 - 5 = 7" },
];

type CharState = "correct" | "present" | "absent";

interface Char {
  char: string;
  state: CharState;
}

const Nerdle = () => {
  const [targetEquation, setTargetEquation] = useState("");
  const [targetDisplay, setTargetDisplay] = useState("");
  const [guesses, setGuesses] = useState<Char[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">(
    "playing"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const random = EQUATIONS[Math.floor(Math.random() * EQUATIONS.length)];
    setTargetEquation(random.equation);
    setTargetDisplay(random.display);
  }, []);

  const isValidEquation = (eq: string): boolean => {
    // Check format: NUMBER OPERATOR NUMBER = NUMBER
    const pattern = /^\d+[+\-*/]\d+=\d+$/;
    if (!pattern.test(eq)) return false;

    // Check if equation is mathematically correct
    const parts = eq.split(/[+\-*/=]/);
    const op = eq.match(/[+\-*/]/)?.[0];
    const num1 = parseInt(parts[0]);
    const num2 = parseInt(parts[1]);
    const result = parseInt(parts[2]);

    if (!op) return false;

    let calculated: number;
    if (op === "+") calculated = num1 + num2;
    else if (op === "-") calculated = num1 - num2;
    else if (op === "*") calculated = num1 * num2;
    else if (op === "/") calculated = num1 / num2;
    else return false;

    return calculated === result;
  };

  const evaluateGuess = (guess: string): Char[] => {
    const result: Char[] = [];
    const targetArray = targetEquation.split("");
    const guessArray = guess.split("");

    // First pass: mark correct positions
    for (let i = 0; i < Math.min(targetArray.length, guessArray.length); i++) {
      if (guessArray[i] === targetArray[i]) {
        result.push({ char: guessArray[i], state: "correct" });
      } else {
        result.push({ char: guessArray[i], state: "absent" });
      }
    }

    // Second pass: mark present characters
    const used = new Array(targetArray.length).fill(false);
    for (let i = 0; i < result.length; i++) {
      if (result[i].state === "correct") {
        used[i] = true;
      }
    }

    for (let i = 0; i < result.length; i++) {
      if (result[i].state === "absent") {
        const char = guessArray[i];
        const index = targetArray.findIndex(
          (c, idx) => c === char && !used[idx]
        );
        if (index !== -1) {
          result[i].state = "present";
          used[index] = true;
        }
      }
    }

    return result;
  };

  const handleKeyPress = useCallback(
    (key: string) => {
      if (gameState !== "playing") return;

      if (key === "Enter") {
        if (currentGuess.length >= 5) {
          if (isValidEquation(currentGuess)) {
            const evaluated = evaluateGuess(currentGuess);
            setGuesses([...guesses, evaluated]);

            if (currentGuess === targetEquation) {
              setGameState("won");
              setMessage("Congratulations! You solved it!");
            } else if (guesses.length === 5) {
              setGameState("lost");
              setMessage(`Game Over! The equation was ${targetDisplay}`);
            } else {
              setCurrentGuess("");
            }
          } else {
            setMessage("Invalid equation! Must be mathematically correct.");
            setTimeout(() => setMessage(""), 2000);
          }
        }
      } else if (key === "Backspace") {
        setCurrentGuess(currentGuess.slice(0, -1));
      } else if (
        key.length === 1 &&
        /[0-9+\-*/=]/.test(key) &&
        currentGuess.length < 8
      ) {
        setCurrentGuess((prev) => prev + key);
      }
    },
    [currentGuess, guesses, targetEquation, gameState]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handleKeyPress(e.key);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyPress]);

  const getCharColor = (state: CharState) => {
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
    const random = EQUATIONS[Math.floor(Math.random() * EQUATIONS.length)];
    setTargetEquation(random.equation);
    setTargetDisplay(random.display);
    setGuesses([]);
    setCurrentGuess("");
    setGameState("playing");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-4">
      <Link
        href="/"
        className="absolute top-4 left-4 text-white hover:text-indigo-300 transition-colors"
      >
        ← Back to Games
      </Link>

      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-white text-center mb-2">
          NERDLE
        </h1>
        <p className="text-center text-indigo-200 mb-6">
          Solve the math equation
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
              <div key={row} className="flex gap-2 justify-center">
                {[...Array(8)].map((_, col) => {
                  if (isCurrentRow) {
                    const char = currentGuess[col] || "";
                    return (
                      <div
                        key={col}
                        className="w-12 h-12 bg-gray-800 border-2 border-gray-600 rounded flex items-center justify-center text-white text-xl font-bold"
                      >
                        {char}
                      </div>
                    );
                  } else {
                    const charData = guess[col] || {
                      char: "",
                      state: "absent",
                    };
                    return (
                      <div
                        key={col}
                        className={`w-12 h-12 ${getCharColor(
                          charData.state
                        )} rounded flex items-center justify-center text-white text-xl font-bold`}
                      >
                        {charData.char}
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
              className="px-6 py-2 bg-white text-indigo-800 font-bold rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Play Again
            </button>
          </div>
        )}

        <div className="grid grid-cols-10 gap-1 max-w-md mx-auto">
          {[
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "0",
            "+",
            "-",
            "*",
            "/",
            "=",
          ].map((key) => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              className="py-3 px-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-lg font-semibold"
            >
              {key === "*" ? "×" : key === "/" ? "÷" : key}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-1 max-w-md mx-auto">
          <button
            onClick={() => handleKeyPress("Enter")}
            className="flex-1 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors font-semibold"
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

export default Nerdle;
