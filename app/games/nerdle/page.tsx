"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, HelpCircle, RotateCcw, Bug, Map, Calendar, X } from "lucide-react";
import { completeLevel } from "@/lib/levelProgress";

interface DailyEquation {
  date: string;
  equation: string;
}

type CharState = "correct" | "present" | "absent";

interface Char {
  char: string;
  state: CharState;
}

// Tarih formatını DD.MM.YYYY'den YYYY-MM-DD'ye çevir
function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('.');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

// Bugünün tarihini DD.MM.YYYY formatında al
function getTodayFormatted(): string {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}.${month}.${year}`;
}

// Display formatı oluştur (operatörleri güzel göster)
function getDisplayFormat(equation: string): string {
  return equation
    .replace(/\*/g, ' × ')
    .replace(/\//g, ' / ')
    .replace(/\+/g, ' + ')
    .replace(/-/g, ' - ')
    .replace(/=/g, ' = ');
}

const Nerdle = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode"); // "levels" | "practice" | null
  const levelId = searchParams.get("levelId"); // Hangi level'dan gelindi

  const [equations, setEquations] = useState<DailyEquation[]>([]);
  const [targetEquation, setTargetEquation] = useState("");
  const [targetDisplay, setTargetDisplay] = useState("");
  const [guesses, setGuesses] = useState<Char[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">(
    "playing"
  );
  const [message, setMessage] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [showPreviousGames, setShowPreviousGames] = useState(false);
  const [levelCompleted, setLevelCompleted] = useState(false);
  const [gameDay, setGameDay] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Oyun kazanıldığında levels modunda level'ı tamamla
  useEffect(() => {
    if (gameState === "won" && mode === "levels" && levelId && !levelCompleted) {
      completeLevel(parseInt(levelId));
      setLevelCompleted(true);
    }
  }, [gameState, mode, levelId, levelCompleted]);

  // Denklemleri yükle ve bugünün denklemini seç
  useEffect(() => {
    const loadEquations = async () => {
      try {
        const response = await fetch("/nerdle/equations.json");
        const data: DailyEquation[] = await response.json();
        setEquations(data);
        
        // Bugünün denklemini bul
        const today = getTodayFormatted();
        const todayEquation = data.find(eq => eq.date === today);
        
        if (todayEquation) {
          setTargetEquation(todayEquation.equation);
          setTargetDisplay(getDisplayFormat(todayEquation.equation));
          // Gün numarasını hesapla
          const dayIndex = data.findIndex(eq => eq.date === today);
          setGameDay(dayIndex + 1);
        } else {
          // Bugün için denklem yoksa rastgele seç
          const randomEq = data[Math.floor(Math.random() * data.length)];
          setTargetEquation(randomEq.equation);
          setTargetDisplay(getDisplayFormat(randomEq.equation));
          setGameDay(null);
        }
      } catch (error) {
        console.error("Denklemler yüklenemedi:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEquations();
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
        return "bg-yellow-500";
      case "absent":
        return "bg-slate-600";
      default:
        return "bg-slate-800 border-2 border-slate-700";
    }
  };

  // Convert raw characters to display symbols
  const displayChar = (char: string): string => {
    if (char === "*") return "×";
    return char;
  };

  // Klavye karakterinin durumunu hesapla
  const getKeyboardCharState = (char: string): CharState | null => {
    let bestState: CharState | null = null;
    
    for (const guess of guesses) {
      for (const charData of guess) {
        if (charData.char === char) {
          // correct > present > absent
          if (charData.state === "correct") {
            return "correct"; // En iyi durum, hemen döndür
          } else if (charData.state === "present" && bestState !== "present") {
            bestState = "present";
          } else if (charData.state === "absent" && bestState === null) {
            bestState = "absent";
          }
        }
      }
    }
    
    return bestState;
  };

  // Klavye tuşu için stil
  const getKeyboardKeyStyle = (key: string): string => {
    const state = getKeyboardCharState(key);
    switch (state) {
      case "correct":
        return "bg-emerald-600 text-white border-emerald-500";
      case "present":
        return "bg-yellow-500 text-white border-yellow-400";
      case "absent":
        return "bg-slate-800 text-slate-500 border-slate-700";
      default:
        return "bg-slate-600 text-slate-200 border-slate-500 hover:bg-slate-500";
    }
  };

  const resetGame = () => {
    if (equations.length === 0) return;
    const randomEq = equations[Math.floor(Math.random() * equations.length)];
    setTargetEquation(randomEq.equation);
    setTargetDisplay(getDisplayFormat(randomEq.equation));
    setGuesses([]);
    setCurrentGuess("");
    setGameState("playing");
    setMessage("");
    setGameDay(null);
    setSelectedDate(null);
  };

  // Belirli bir tarihin denklemini oyna
  const playDate = (dateStr: string) => {
    const eq = equations.find(e => e.date === dateStr);
    if (eq) {
      setTargetEquation(eq.equation);
      setTargetDisplay(getDisplayFormat(eq.equation));
      setGuesses([]);
      setCurrentGuess("");
      setGameState("playing");
      setMessage("");
      setSelectedDate(dateStr);
      const dayIndex = equations.findIndex(e => e.date === dateStr);
      setGameDay(dayIndex + 1);
      setShowPreviousGames(false);
    }
  };

  // Loading durumu
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-4 px-4">
      <div className="w-full max-w-md">
        {/* Debug Modal */}
        {showDebugModal && targetEquation && (
          <>
            <div
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => setShowDebugModal(false)}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 rounded-xl border border-slate-600 p-6 max-w-sm w-full mx-4 shadow-2xl">
              <div className="flex items-center gap-2 mb-4 text-slate-300">
                <Bug className="w-5 h-5" />
                <h3 className="text-lg font-bold">Debug Mode</h3>
              </div>
              
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Hedef Denklem:</p>
                <p className="text-2xl font-bold text-emerald-400 tracking-wide">
                  {targetDisplay}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ({targetEquation})
                </p>
              </div>
              
              <button
                onClick={() => setShowDebugModal(false)}
                className="w-full mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Kapat
              </button>
            </div>
          </>
        )}

        {/* Previous Games Modal */}
        {showPreviousGames && (
          <>
            <div
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => setShowPreviousGames(false)}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 rounded-xl border border-slate-600 p-4 w-[90%] shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-5 h-5" />
                  <h3 className="text-base font-bold">Önceki Oyunlar</h3>
                </div>
                <button 
                  onClick={() => setShowPreviousGames(false)}
                  className="p-1 hover:bg-slate-700 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[60vh] space-y-1.5">
                {equations
                  .filter(eq => {
                    // Sadece bugün ve önceki tarihleri göster
                    const eqDate = parseDate(eq.date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return eqDate <= today;
                  })
                  .reverse() // En yeniden eskiye
                  .slice(0, 30) // Son 30 gün
                  .map((eq) => {
                    const isToday = eq.date === getTodayFormatted();
                    const isSelected = eq.date === selectedDate;
                    return (
                      <button
                        key={eq.date}
                        onClick={() => playDate(eq.date)}
                        className={`w-full px-3 py-2.5 rounded-lg text-left transition-colors flex items-center justify-between text-sm ${
                          isSelected 
                            ? "bg-emerald-600 text-white" 
                            : isToday 
                              ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500" 
                              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        <span className="font-medium">{eq.date}</span>
                        {isToday && <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded">Bugün</span>}
                      </button>
                    );
                  })}
              </div>
            </div>
          </>
        )}

        <header className="mb-6">
          {/* Top row: Back button | Title | Menu */}
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="p-2 hover:bg-slate-800 rounded transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>

            <h1 className="text-2xl font-bold">NERDLE</h1>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  className="p-2 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <MoreVertical className="w-6 h-6" />
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-12 w-56 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 z-50">
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-all flex items-center gap-3"
                        onClick={() => {
                          setShowPreviousGames(true);
                          setShowMenu(false);
                        }}
                      >
                        <Calendar className="w-5 h-5" />
                        <span>Önceki Oyunlar</span>
                      </button>
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-all flex items-center gap-3"
                        onClick={() => {
                          setShowMenu(false);
                        }}
                      >
                        <HelpCircle className="w-5 h-5" />
                        <span>Nasıl Oynanır</span>
                      </button>
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-all flex items-center gap-3 border-t border-slate-700 mt-1"
                        onClick={() => {
                          resetGame();
                          setShowMenu(false);
                        }}
                      >
                        <RotateCcw className="w-5 h-5" />
                        <span>Sıfırla</span>
                      </button>
                      {process.env.NODE_ENV === "development" && (
                        <button
                          className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-all flex items-center gap-3"
                          onClick={() => {
                            setShowDebugModal(true);
                            setShowMenu(false);
                          }}
                        >
                          <Bug className="w-5 h-5" />
                          <span>Debug: Denklemi Göster</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Game info - Left aligned like Semantle */}
        {gameState === "playing" && (
          <div className="flex items-center justify-between text-sm font-semibold mb-4">
            <span>
              Tahmin: <span className="text-slate-400">{guesses.length}</span>
            </span>
            {gameDay && (
              <span className="text-slate-400">Gün #{gameDay}</span>
            )}
          </div>
        )}

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

            {mode === "levels" ? (
              <button
                onClick={() => router.push("/")}
                className="px-6 py-2 rounded-md bg-emerald-600 text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer flex items-center justify-center gap-2 mx-auto"
              >
                <Map className="w-4 h-4" />
                Bölümlere Devam Et
              </button>
            ) : (
              <button
                onClick={resetGame}
                className="px-6 py-2 rounded-md bg-emerald-600 text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Tekrar Oyna
              </button>
            )}
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
                        {displayChar(char)}
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
                        {displayChar(charData.char)}
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
                className={`py-3 px-2 rounded transition-colors text-lg font-semibold border ${getKeyboardKeyStyle(key)}`}
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
                className={`py-3 px-2 rounded transition-colors text-lg font-semibold border ${getKeyboardKeyStyle(key)}`}
              >
                {key === "*" ? "×" : key}
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

// Suspense wrapper for useSearchParams
export default function NerdlePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    }>
      <Nerdle />
    </Suspense>
  );
}
