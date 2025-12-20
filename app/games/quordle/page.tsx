"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, MoreVertical, HelpCircle, RotateCcw, Bug } from "lucide-react";

type LetterState = "correct" | "present" | "absent" | "empty";

interface Letter {
  letter: string;
  state: LetterState;
}

interface WordleGame {
  targetWord: string;
  guesses: Letter[][];
  gameState: "playing" | "won" | "lost";
}

const Quordle = () => {
  const [allWords, setAllWords] = useState<string[]>([]); // Tüm geçerli kelimeler (tahmin doğrulama)
  const [targetWords, setTargetWords] = useState<string[]>([]); // Hedef kelime havuzu
  const [games, setGames] = useState<WordleGame[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [message, setMessage] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);

  const isInitialMount = useRef(true);

  // Türkçe karakterleri koruyarak büyük harfe çevir
  const toTurkishUpperCase = (str: string): string => {
    return str
      .split("")
      .map((char) => {
        if (char === "i") return "İ";
        if (char === "ı") return "I";
        if (char === "ç") return "Ç";
        if (char === "ğ") return "Ğ";
        if (char === "ö") return "Ö";
        if (char === "ş") return "Ş";
        if (char === "ü") return "Ü";
        return char.toUpperCase();
      })
      .join("");
  };

  // Kelimeleri yükle
  useEffect(() => {
    const loadWords = async () => {
      try {
        // Tüm geçerli kelimeleri yükle (tahmin doğrulama için)
        const allResponse = await fetch("/all_5letters.txt");
        const allText = await allResponse.text();
        const allWordList = allText
          .split("\n")
          .map((w) => toTurkishUpperCase(w.trim()))
          .filter((w) => w.length === 5);
        setAllWords(allWordList);

        // Hedef kelime havuzunu yükle
        const targetResponse = await fetch("/filtered_5letters.txt");
        const targetText = await targetResponse.text();
        const targetWordList = targetText
          .split("\n")
          .map((w) => toTurkishUpperCase(w.trim()))
          .filter((w) => w.length === 5);
        setTargetWords(targetWordList);
      } catch (err) {
        console.error("Kelimeler yüklenemedi:", err);
        const fallback = ["KALEM", "KITAP", "MASA", "KAPAK", "ELMAS", "BEBEK", "ÇIÇEK", "DOLAP"];
        setAllWords(fallback);
        setTargetWords(fallback);
      }
    };
    loadWords();
  }, []);

  // Rastgele 4 kelime seç ve oyunları başlat
  useEffect(() => {
    if (targetWords.length > 0 && games.length === 0) {
      const selectedWords: string[] = [];
      const usedIndices = new Set<number>();

      // 4 farklı rastgele kelime seç
      while (selectedWords.length < 4) {
        const randomIndex = Math.floor(Math.random() * targetWords.length);
        if (!usedIndices.has(randomIndex)) {
          usedIndices.add(randomIndex);
          selectedWords.push(targetWords[randomIndex]);
        }
      }

      const newGames: WordleGame[] = selectedWords.map((word) => ({
        targetWord: word,
        guesses: [],
        gameState: "playing",
      }));

      setGames(newGames);
    }
  }, [targetWords, games.length]);

  // LocalStorage'dan yükle
  useEffect(() => {
    if (games.length === 0) return;

    const saved = localStorage.getItem("quordle-game");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.games && parsed.games.length === 4) {
          setGames(parsed.games);
          setCurrentGuess(parsed.currentGuess || "");
        }
      } catch (e) {
        console.error("Oyun verisi yüklenemedi:", e);
      }
    }

    isInitialMount.current = false;
  }, [games.length]);

  // Oyun durumunu kaydet
  useEffect(() => {
    if (isInitialMount.current || games.length === 0) {
      isInitialMount.current = false;
      return;
    }

    const gameState = {
      games,
      currentGuess,
    };
    localStorage.setItem("quordle-game", JSON.stringify(gameState));
  }, [games, currentGuess]);

  const evaluateGuess = (guess: string, targetWord: string): Letter[] => {
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
      const allWon = games.every((g) => g.gameState === "won");
      const allLost = games.every((g) => g.gameState === "lost");
      if (allWon || allLost) return;

      if (key === "Enter") {
        if (currentGuess.length === 5) {
          if (allWords.includes(currentGuess)) {
            setGames((prevGames) => {
              const newGames = prevGames.map((game) => {
                if (game.gameState !== "playing") return game;

                const evaluated = evaluateGuess(currentGuess, game.targetWord);
                const newGuesses = [...game.guesses, evaluated];

                let newState: "playing" | "won" | "lost" = "playing";
                if (currentGuess === game.targetWord) {
                  newState = "won";
                } else if (newGuesses.length >= 9) {
                  newState = "lost";
                }

                return {
                  ...game,
                  guesses: newGuesses,
                  gameState: newState,
                };
              });

              return newGames;
            });

            setCurrentGuess("");
            setMessage("");
          } else {
            setMessage("Geçerli bir kelime değil!");
            setTimeout(() => setMessage(""), 2000);
          }
        }
      } else if (key === "Backspace") {
        setCurrentGuess(currentGuess.slice(0, -1));
      } else if (
        key.length === 1 &&
        /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(key) &&
        currentGuess.length < 5
      ) {
        // Türkçe karakterleri doğru şekilde büyük harfe çevir
        let upperKey = key;
        if (key === "i" || key === "İ") upperKey = "İ";
        else if (key === "ı" || key === "I") upperKey = "I";
        else if (key === "ç" || key === "Ç") upperKey = "Ç";
        else if (key === "ğ" || key === "Ğ") upperKey = "Ğ";
        else if (key === "ö" || key === "Ö") upperKey = "Ö";
        else if (key === "ş" || key === "Ş") upperKey = "Ş";
        else if (key === "ü" || key === "Ü") upperKey = "Ü";
        else upperKey = key.toUpperCase();

        setCurrentGuess((prev) => (prev + upperKey).slice(0, 5));
      }
    },
    [currentGuess, games, allWords]
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
        return "bg-emerald-600";
      case "present":
        return "bg-yellow-500";
      case "absent":
        return "bg-slate-600";
      default:
        return "bg-slate-800 border-2 border-slate-600";
    }
  };

  const getKeyboardKeyColor = (key: string) => {
    let hasCorrect = false;
    let hasPresent = false;
    const absentInGames = new Set<number>(); // Hangi oyunlarda absent olduğunu takip et

    games.forEach((game, gameIndex) => {
      let foundInGame = false;
      game.guesses.forEach((guess) => {
        guess.forEach((letter) => {
          // I ve İ'yi doğru şekilde karşılaştır (toUpperCase kullanmadan)
          if (letter.letter === key) {
            if (letter.state === "correct") {
              hasCorrect = true;
              foundInGame = true;
            } else if (letter.state === "present") {
              hasPresent = true;
              foundInGame = true;
            } else if (letter.state === "absent") {
              absentInGames.add(gameIndex);
              foundInGame = true;
            }
          }
        });
      });
    });

    // 4 oyunda da absent ise çok koyu renk
    if (absentInGames.size === 4) {
      return "bg-slate-900 text-slate-500";
    }

    if (hasCorrect) return "bg-emerald-600 text-white";
    if (hasPresent) return "bg-yellow-500 text-white";
    if (absentInGames.size > 0) return "bg-slate-600 text-white";
    return "bg-slate-700 text-slate-200";
  };

  const resetGame = () => {
    if (targetWords.length === 0) return;

    const selectedWords: string[] = [];
    const usedIndices = new Set<number>();

    while (selectedWords.length < 4) {
      const randomIndex = Math.floor(Math.random() * targetWords.length);
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex);
        selectedWords.push(targetWords[randomIndex]);
      }
    }

    const newGames: WordleGame[] = selectedWords.map((word) => ({
      targetWord: word,
      guesses: [],
      gameState: "playing",
    }));

    setGames(newGames);
    setCurrentGuess("");
    setMessage("");
    localStorage.removeItem("quordle-game");
  };

  if (games.length === 0 || allWords.length === 0) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    );
  }

  const allWon = games.every((g) => g.gameState === "won");
  const allLost = games.every((g) => g.gameState === "lost");
  const totalGuesses = Math.max(...games.map((g) => g.guesses.length));

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-4 px-4">
      <div className="w-full max-w-4xl">
        {/* Debug Modal */}
        {showDebugModal && games.length > 0 && (
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
              
              <div className="space-y-2">
                <p className="text-slate-400 text-sm mb-3">Hedef Kelimeler:</p>
                <div className="grid grid-cols-2 gap-2">
                  {games.map((game, idx) => (
                    <div key={idx} className="bg-slate-700 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-400 mb-1">Kelime {idx + 1}</p>
                      <p className="text-lg font-bold text-emerald-400 tracking-widest">
                        {game.targetWord}
                      </p>
                    </div>
                  ))}
                </div>
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

        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="p-2 hover:bg-slate-800 rounded transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>

            <h1 className="text-2xl font-bold">QUORDLE</h1>

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
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3"
                        onClick={() => {
                          setShowMenu(false);
                        }}
                      >
                        <HelpCircle className="w-5 h-5" />
                        <span>Nasıl Oynanır</span>
                      </button>
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3 border-t border-slate-700 mt-1"
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
                          className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3"
                          onClick={() => {
                            setShowDebugModal(true);
                            setShowMenu(false);
                          }}
                        >
                          <Bug className="w-5 h-5" />
                          <span>Debug: Kelimeleri Göster</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {!allWon && !allLost && (
            <div className="flex items-center gap-4 text-sm font-semibold">
              <span>
                Tahmin: <span className="text-slate-400">{totalGuesses}/9</span>
              </span>
              <span>
                Tamamlanan:{" "}
                <span className="text-emerald-400">
                  {games.filter((g) => g.gameState === "won").length}/4
                </span>
              </span>
            </div>
          )}
        </header>

        {/* Success/Lost State */}
        {(allWon || allLost) && (
          <div
            className={`mb-6 bg-slate-800 rounded-lg p-6 text-center border-2 ${
              allLost ? "border-slate-500" : "border-emerald-600"
            }`}
          >
            <h2
              className={`text-2xl font-bold mb-3 ${
                allLost ? "text-slate-300" : "text-emerald-500"
              }`}
            >
              {allLost ? "Oyun Bitti" : "Tebrikler! Tüm Kelimeleri Buldunuz!"}
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              Toplam tahmin: {totalGuesses}
            </p>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="mb-4 bg-slate-800 border border-slate-700 rounded-md px-4 py-3 text-center">
            <p className="text-sm text-slate-300">{message}</p>
          </div>
        )}

        {/* 4 Wordle Grids */}
        <div className="grid grid-cols-2 gap-4 mb-6 max-w-sm mx-auto">
          {games.map((game, gameIndex) => {
            const isActive = game.gameState === "playing";
            const isCurrentRow = (row: number) =>
              row === game.guesses.length && isActive;

            return (
              <div
                key={gameIndex}
                className={`bg-slate-800 rounded-lg p-4 ${
                  game.gameState === "won"
                    ? "border-2 border-emerald-600"
                    : game.gameState === "lost"
                    ? "border-2 border-red-600"
                    : "border border-slate-700"
                }`}
              >
                <div className="mb-2 text-xs font-semibold text-slate-400">
                  Kelime {gameIndex + 1}
                  {game.gameState === "won" && (
                    <span className="ml-2 text-emerald-400">✓</span>
                  )}
                  {game.gameState === "lost" && (
                    <span className="ml-2 text-red-400">✗</span>
                  )}
                </div>
                <div className="space-y-1">
                  {[...Array(9)].map((_, row) => {
                    const guess = game.guesses[row] || [];
                    const isCurrent = isCurrentRow(row);

                    return (
                      <div key={row} className="flex gap-1">
                        {[...Array(5)].map((_, col) => {
                          if (isCurrent) {
                            const letter = currentGuess[col] || "";
                            return (
                              <div
                                key={col}
                                className="flex-1 aspect-square bg-slate-700 border-2 border-slate-600 rounded flex items-center justify-center text-white text-lg font-bold"
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
                                )} rounded flex items-center justify-center text-white text-lg font-bold`}
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
                {(game.gameState === "won" || game.gameState === "lost") && (
                  <div className="mt-2 text-xs text-slate-400 text-center">
                    {game.targetWord}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Virtual Keyboard */}
        <div className="space-y-1.5 w-full px-1">
          {/* İlk satır: E R T Y U I O P Ğ Ü */}
          <div className="flex gap-[3px] justify-center">
            {["E", "R", "T", "Y", "U", "I", "O", "P", "Ğ", "Ü"].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={`flex-1 py-3.5 rounded text-xs sm:text-sm font-bold max-w-[36px] ${getKeyboardKeyColor(
                  key
                )}`}
              >
                {key}
              </button>
            ))}
          </div>
          {/* İkinci satır: A S D F G H J K L Ş İ */}
          <div className="flex gap-[3px] justify-center px-3">
            {["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ş", "İ"].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={`flex-1 py-3.5 rounded text-xs sm:text-sm font-bold max-w-[32px] ${getKeyboardKeyColor(
                  key
                )}`}
              >
                {key}
              </button>
            ))}
          </div>
          {/* Üçüncü satır: ENTER Z C V B N M Ö Ç BACKSPACE */}
          <div className="flex gap-[3px] justify-center">
            <button
              onClick={() => handleKeyPress("Enter")}
              className="flex-[1.5] py-3 bg-emerald-600 text-white rounded hover:bg-emerald-500 transition-colors font-bold text-[10px] sm:text-xs max-w-[54px]"
            >
              ENTER
            </button>
            {["Z", "C", "V", "B", "N", "M", "Ö", "Ç"].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={`flex-1 py-3 rounded text-xs sm:text-sm font-bold max-w-[36px] ${getKeyboardKeyColor(
                  key
                )}`}
              >
                {key}
              </button>
            ))}
            <button
              onClick={() => handleKeyPress("Backspace")}
              className="flex-[1.5] py-3 bg-red-600 text-white rounded hover:bg-red-500 transition-colors font-bold text-sm max-w-[54px]"
            >
              ⌫
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Quordle;
