"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";

// Valid equations (format: NUMBER OPERATOR NUMBER = RESULT, 8 characters, can include parentheses)
const EQUATIONS = [
  { equation: "12+34=46", display: "12 + 34 = 46" },
  { equation: "12*5=60", display: "12 × 5 = 60" },
  { equation: "10*6=60", display: "10 × 6 = 60" },
  { equation: "15+23=38", display: "15 + 23 = 38" },
  { equation: "20-12=8", display: "20 - 12 = 8" },
  { equation: "24/3=8", display: "24 ÷ 3 = 8" },
  { equation: "18+25=43", display: "18 + 25 = 43" },
  { equation: "12*4=48", display: "12 × 4 = 48" },
  { equation: "16/2=8", display: "16 ÷ 2 = 8" },
  { equation: "11+22=33", display: "11 + 22 = 33" },
  { equation: "(1+2)*3=9", display: "(1 + 2) × 3 = 9" },
  { equation: "2*(3+1)=8", display: "2 × (3 + 1) = 8" },
  { equation: "(1+1)*4=8", display: "(1 + 1) × 4 = 8" },
  { equation: "3*(2+1)=9", display: "3 × (2 + 1) = 9" },
  { equation: "(4+2)/3=2", display: "(4 + 2) ÷ 3 = 2" },
  { equation: "2*(1+3)=8", display: "2 × (1 + 3) = 8" },
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
    // Check if equation contains = sign
    if (!eq.includes("=")) return false;

    try {
      // Replace × and ÷ with * and / for evaluation
      const evalEq = eq.replace(/×/g, "*").replace(/÷/g, "/");

      // Split into left and right sides
      const [leftSide, rightSide] = evalEq.split("=");
      if (!leftSide || !rightSide) return false;

      // Evaluate left side (can contain parentheses)
      const leftResult = Function(`"use strict"; return (${leftSide})`)();
      const rightResult = parseFloat(rightSide);

      // Check if results match (with small tolerance for floating point)
      return Math.abs(leftResult - rightResult) < 0.0001;
    } catch (e) {
      return false;
    }
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
        if (currentGuess.length === 8) {
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
        /[0-9+\-*/=()]/.test(key) &&
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
        return "bg-emerald-600";
      case "present":
        return "bg-orange-500";
      case "absent":
        return "bg-slate-600";
      default:
        return "bg-slate-800 border-2 border-slate-700";
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
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-4 px-4">
      <div className="w-full max-w-md">
        <header className="mb-6">
          {/* Top row: Back button | Title | Reset button */}
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="p-2 hover:bg-slate-800 rounded transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>

            <h1 className="text-2xl font-bold">NERDLE</h1>

            <button
              onClick={resetGame}
              className="p-2 hover:bg-slate-800 rounded transition-colors cursor-pointer"
              title="Yeniden Başla"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
          </div>

          {/* Game info */}
          {gameState === "playing" && (
            <div className="flex items-center gap-4 text-sm font-semibold">
              <span>
                Tahmin: <span className="text-slate-400">{guesses.length}</span>
              </span>
            </div>
          )}
        </header>

        {/* Success/Lost State */}
        {(gameState === "won" || gameState === "lost") && (
          <div
            className={`mb-10 bg-slate-800 rounded-lg p-6 text-center border-2 ${
              gameState === "lost" ? "border-slate-500" : "border-emerald-600"
            }`}
          >
            <h2
              className={`text-2xl font-bold mb-3 ${
                gameState === "lost" ? "text-slate-300" : "text-emerald-500"
              }`}
            >
              {gameState === "lost" ? "Oyun Bitti" : "Tebrikler!"}
            </h2>

            <p className="text-lg mb-4">
              {gameState === "lost" ? "Denklem" : "Denklemi buldunuz"}:{" "}
              <span
                className={`font-bold ${
                  gameState === "lost" ? "text-slate-300" : "text-emerald-500"
                }`}
              >
                {targetDisplay}
              </span>
            </p>

            <div className="mb-3 flex items-center justify-center gap-4 text-sm font-semibold">
              <span className="text-slate-500">
                Tahmin: <span className="text-slate-400">{guesses.length}</span>
              </span>
            </div>

            <button
              onClick={resetGame}
              className="px-6 py-2 rounded-md bg-emerald-600 text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Tekrar Oyna
            </button>
          </div>
        )}

        {/* Error Message */}
        {message && gameState === "playing" && (
          <div className="mb-6 bg-slate-800 border border-slate-700 rounded-md px-4 py-3 text-center">
            <p className="text-sm text-slate-300">{message}</p>
          </div>
        )}

        {/* Game Grid */}
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
                        className="w-12 h-12 bg-slate-800 border-2 border-slate-700 rounded flex items-center justify-center text-slate-100 text-xl font-bold"
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
                        )} rounded flex items-center justify-center text-slate-100 text-xl font-bold`}
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

        {/* Virtual Keyboard */}
        <div className="space-y-1 max-w-md mx-auto mb-2">
          {/* First row: Numbers and operators */}
          <div className="grid grid-cols-10 gap-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className="py-3 px-2 bg-slate-800 text-slate-100 rounded hover:bg-slate-700 transition-colors text-lg font-semibold border border-slate-700"
              >
                {key}
              </button>
            ))}
          </div>
          {/* Second row: Operators and parentheses */}
          <div className="grid grid-cols-7 gap-1">
            {["+", "-", "*", "/", "=", "(", ")"].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className="py-3 px-2 bg-slate-800 text-slate-100 rounded hover:bg-slate-700 transition-colors text-lg font-semibold border border-slate-700"
              >
                {key === "*" ? "×" : key === "/" ? "÷" : key}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1 max-w-md mx-auto">
          <button
            onClick={() => handleKeyPress("Enter")}
            className="flex-1 py-2 bg-emerald-600 text-slate-100 rounded hover:bg-emerald-700 transition-colors font-semibold"
          >
            ENTER
          </button>
          <button
            onClick={() => handleKeyPress("Backspace")}
            className="flex-1 py-2 bg-slate-700 text-slate-100 rounded hover:bg-slate-600 transition-colors font-semibold"
          >
            ⌫
          </button>
        </div>
      </div>
    </main>
  );
};

export default Nerdle;
