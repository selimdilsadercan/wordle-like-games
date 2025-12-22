"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MoreVertical,
  HelpCircle,
  CalendarDays,
  Settings,
  RotateCcw,
  Bug,
  Map,
} from "lucide-react";
import HowToPlayModal from "./HowToPlayModal";
import PreviousGamesModal from "./PreviousGamesModal";
import { completeLevel, getCurrentLevel } from "@/lib/levelProgress";
import { markGameCompleted } from "@/lib/dailyCompletion";

type LetterState = "correct" | "present" | "absent" | "empty";

interface Letter {
  letter: string;
  state: LetterState;
}

// Sabitler - daily_wordle.json ile eşleşmeli
const FIRST_GAME_DATE = new Date(2025, 10, 23); // 23 Kasım 2025 (ay 0-indexed)
const FIRST_GAME_NUMBER = 1;

// Bugünkü oyun numarasını hesapla
function getTodaysGameNumber(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDate = new Date(FIRST_GAME_DATE);
  firstDate.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor(
    (today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return FIRST_GAME_NUMBER + daysDiff;
}

// Oyun numarasından güzel tarih formatı
function getFormattedDateFromGameNumber(gameNumber: number): string {
  const daysDiff = gameNumber - FIRST_GAME_NUMBER;
  const date = new Date(FIRST_GAME_DATE);
  date.setDate(date.getDate() + daysDiff);

  const monthNames = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];

  const day = date.getDate();
  const month = monthNames[date.getMonth()];

  return `${day} ${month}`;
}

// En son oynanan oyun numarasını bul
function getLastPlayedGameNumber(): number | null {
  if (typeof window === "undefined") return null;

  let lastPlayedGame: number | null = null;
  const todayGameNumber = getTodaysGameNumber();

  for (let i = 0; i <= 365; i++) {
    const gameNum = todayGameNumber - i;
    if (gameNum < FIRST_GAME_NUMBER) break;

    const saved = localStorage.getItem(`wordle-game-${gameNum}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          (parsed.guesses && parsed.guesses.length > 0) ||
          parsed.gameWon ||
          parsed.gameLost
        ) {
          lastPlayedGame = gameNum;
          break;
        }
      } catch (e) {
        // Hata durumunda devam et
      }
    }
  }

  return lastPlayedGame;
}

// Oyun numarasına göre deterministik kelime seç
function getWordForGame(gameNumber: number, words: string[]): string {
  // Deterministik rastgele sayı üret (oyun numarasına göre)
  const seed = gameNumber;
  const index = seed % words.length;
  return words[index].toUpperCase();
}

// Levels modunda tamamlanmamış en son oyunu bul
function getNextUncompletedGame(): number {
  const todayGame = getTodaysGameNumber();
  
  // Bugünden geriye doğru git, tamamlanmamış ilk oyunu bul
  for (let gameNum = todayGame; gameNum >= 1; gameNum--) {
    const saved = localStorage.getItem(`wordle-game-${gameNum}`);
    if (!saved) {
      return gameNum; // Hiç oynanmamış
    }
    try {
      const parsed = JSON.parse(saved);
      // Oyun kazanılmamış veya kaybedilmemişse bu oyunu döndür
      if (!parsed.gameWon && !parsed.gameLost) {
        return gameNum;
      }
    } catch (e) {
      return gameNum; // Parse hatası varsa bu oyunu döndür
    }
  }
  
  // Tüm oyunlar tamamlandıysa bugünkü oyunu döndür
  return todayGame;
}

const Wordle = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode"); // "levels" | "practice" | null
  const levelId = searchParams.get("levelId"); // Hangi level'dan gelindi
  
  const [allWords, setAllWords] = useState<string[]>([]); // Tüm geçerli kelimeler (tahmin doğrulama)
  const [targetWords, setTargetWords] = useState<string[]>([]); // Hedef kelime havuzu
  const [targetWord, setTargetWord] = useState("");
  const [guesses, setGuesses] = useState<Letter[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">(
    "playing"
  );
  const [message, setMessage] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showPreviousGames, setShowPreviousGames] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [levelCompleted, setLevelCompleted] = useState(false);
  const [shakeRow, setShakeRow] = useState(false);
  const [showInvalidWordToast, setShowInvalidWordToast] = useState(false);
  const [letterAnimationKeys, setLetterAnimationKeys] = useState<number[]>([0, 0, 0, 0, 0]);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  // Oyun numarası - mod'a göre belirle
  const [gameNumber, setGameNumber] = useState(getTodaysGameNumber());
  
  // Levels modunda tamamlanmamış oyunu bul
  useEffect(() => {
    if (mode === "levels") {
      const nextGame = getNextUncompletedGame();
      setGameNumber(nextGame);
    } else {
      // Practice modunda en son oynanan veya bugünkü
      const lastPlayed = getLastPlayedGameNumber();
      setGameNumber(lastPlayed || getTodaysGameNumber());
    }
  }, [mode]);
  
  // Oyun kazanıldığında levels modunda level'ı tamamla
  useEffect(() => {
    if (gameState === "won" && mode === "levels" && levelId && !levelCompleted) {
      completeLevel(parseInt(levelId));
      setLevelCompleted(true);
    }
  }, [gameState, mode, levelId, levelCompleted]);

  // Oyun kazanıldığında günlük tamamlamayı işaretle (tüm modlarda)
  useEffect(() => {
    if (gameState === "won") {
      markGameCompleted("wordle");
    }
  }, [gameState]);

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
        const allResponse = await fetch("/wordle/all_5letters.txt");
        const allText = await allResponse.text();
        const allWordList = allText
          .split("\n")
          .map((w) => toTurkishUpperCase(w.trim()))
          .filter((w) => w.length === 5);
        setAllWords(allWordList);

        // Günlük kelimeler JSON'u yükle
        const dailyResponse = await fetch("/wordle/daily_wordle.json");
        const dailyData = await dailyResponse.json();
        
        // Bugünün tarihini DD.MM.YYYY formatında al
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        const todayFormatted = `${day}.${month}.${year}`;
        
        // Bugünün kelimesini bul
        const todayWord = dailyData.daily_words.find(
          (entry: { date: string; word: string }) => entry.date === todayFormatted
        );
        
        if (todayWord) {
          setTargetWord(toTurkishUpperCase(todayWord.word));
        } else {
          // Bugün için kelime yoksa rastgele seç
          const randomWord = dailyData.daily_words[
            Math.floor(Math.random() * dailyData.daily_words.length)
          ];
          setTargetWord(toTurkishUpperCase(randomWord.word));
        }
        
        // Tüm günlük kelimeleri target words olarak kaydet (eski API uyumu için)
        const targetWordList = dailyData.daily_words.map(
          (entry: { date: string; word: string }) => toTurkishUpperCase(entry.word)
        );
        setTargetWords(targetWordList);
      } catch (err) {
        console.error("Kelimeler yüklenemedi:", err);
        // Fallback kelimeler
        const fallback = [
          "KALEM",
          "KİTAP",
          "MASAJ",
          "KAPAK",
          "ELMAS",
        ];
        setAllWords(fallback);
        setTargetWords(fallback);
        setTargetWord(fallback[0]);
      }
    };
    loadWords();
  }, []);

  // Oyun numarası değiştiğinde hedef kelimeyi güncelle
  useEffect(() => {
    const updateTargetWord = async () => {
      if (targetWords.length === 0) return;
      
      try {
        const dailyResponse = await fetch("/wordle/daily_wordle.json");
        const dailyData = await dailyResponse.json();
        
        // Oyun numarasından tarihi hesapla
        const daysDiff = gameNumber - FIRST_GAME_NUMBER;
        const gameDate = new Date(FIRST_GAME_DATE);
        gameDate.setDate(gameDate.getDate() + daysDiff);
        
        const day = String(gameDate.getDate()).padStart(2, '0');
        const month = String(gameDate.getMonth() + 1).padStart(2, '0');
        const year = gameDate.getFullYear();
        const dateFormatted = `${day}.${month}.${year}`;
        
        // Bu tarihin kelimesini bul
        const wordEntry = dailyData.daily_words.find(
          (entry: { date: string; word: string }) => entry.date === dateFormatted
        );
        
        if (wordEntry) {
          setTargetWord(toTurkishUpperCase(wordEntry.word));
        } else {
          // Kelime yoksa deterministik seçim
          const word = getWordForGame(gameNumber, targetWords);
          setTargetWord(word);
        }
      } catch (err) {
        // Hata durumunda deterministik seçim
        const word = getWordForGame(gameNumber, targetWords);
        setTargetWord(word);
      }
    };
    
    updateTargetWord();
  }, [gameNumber, targetWords]);

  // LocalStorage'dan oyun durumunu yükle - oyun numarası değiştiğinde
  useEffect(() => {
    isInitialMount.current = true;

    setGuesses([]);
    setGameState("playing");
    setCurrentGuess("");
    setMessage("");

    const savedGame = localStorage.getItem(`wordle-game-${gameNumber}`);
    if (savedGame) {
      try {
        const parsed = JSON.parse(savedGame);
        setGuesses(parsed.guesses || []);
        setGameState(
          parsed.gameWon ? "won" : parsed.gameLost ? "lost" : "playing"
        );
        setCurrentGuess(parsed.currentGuess || "");
      } catch (e) {
        console.error("Oyun verisi yüklenemedi:", e);
      }
    }

    setTimeout(() => {
      isInitialMount.current = false;
    }, 0);
  }, [gameNumber, allWords, targetWords]);

  // Oyun durumunu kaydet
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (targetWord) {
      const savedState = {
        gameNumber,
        targetWord,
        guesses,
        gameWon: gameState === "won",
        gameLost: gameState === "lost",
        currentGuess,
      };
      localStorage.setItem(
        `wordle-game-${gameNumber}`,
        JSON.stringify(savedState)
      );
    }
  }, [gameNumber, guesses, gameState, currentGuess, targetWord]);

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
      if (gameState !== "playing" || !targetWord) return;

      if (key === "Enter") {
        if (currentGuess.length === 5) {
          if (allWords.includes(currentGuess)) {
            const evaluated = evaluateGuess(currentGuess);
            const newGuesses = [...guesses, evaluated];
            setGuesses(newGuesses);

            if (currentGuess === targetWord) {
              setGameState("won");
              setMessage("");
            } else if (newGuesses.length >= 6) {
              setGameState("lost");
              setMessage("");
            } else {
              setCurrentGuess("");
            }
          } else {
            // Shake animasyonu ve toast göster
            setShakeRow(true);
            setShowInvalidWordToast(true);
            setTimeout(() => setShakeRow(false), 600);
            setTimeout(() => setShowInvalidWordToast(false), 2000);
          }
        }
      } else if (key === "Backspace") {
        if (currentGuess.length > 0) {
          const deleteIdx = currentGuess.length - 1;
          setDeletingIndex(deleteIdx);
          setTimeout(() => {
            setDeletingIndex(null);
            setCurrentGuess(prev => prev.slice(0, -1));
          }, 100);
        }
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

        // Pop animasyonu için harfin key'ini güncelle (yeniden mount için)
        const newIndex = currentGuess.length;
        setLetterAnimationKeys(prev => {
          const newKeys = [...prev];
          newKeys[newIndex] = prev[newIndex] + 1;
          return newKeys;
        });
        
        setCurrentGuess((prev) => (prev + upperKey).slice(0, 5));
      }
    },
    [currentGuess, guesses, targetWord, gameState, allWords]
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
    // Tüm tahminlerde bu harfin durumunu kontrol et
    let hasCorrect = false;
    let hasPresent = false;
    let hasAbsent = false;

    guesses.forEach((guess) => {
      guess.forEach((letter) => {
        // I ve İ'yi doğru şekilde karşılaştır (toUpperCase kullanmadan)
        if (letter.letter === key) {
          if (letter.state === "correct") hasCorrect = true;
          else if (letter.state === "present") hasPresent = true;
          else if (letter.state === "absent") hasAbsent = true;
        }
      });
    });

    if (hasCorrect) return "bg-emerald-600 text-white";
    if (hasPresent) return "bg-yellow-500 text-white";
    if (hasAbsent) return "bg-slate-800 text-slate-500";
    return "bg-slate-700 text-slate-200";
  };

  if (!targetWord || allWords.length === 0) {
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
        {showDebugModal && targetWord && (
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
                <p className="text-slate-400 text-sm mb-2">Hedef Kelime:</p>
                <p className="text-3xl font-bold text-emerald-400 tracking-widest">
                  {targetWord}
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

        <header className="mb-6">
          {/* Top row: Back button | Title | Menu */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <h1 className="text-2xl font-bold">WORDLE</h1>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  className="p-2 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <MoreVertical className="w-6 h-6" />
                </button>

                {/* Dropdown Menu */}
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
                          setShowHowToPlay(true);
                          setShowMenu(false);
                        }}
                      >
                        <HelpCircle className="w-5 h-5" />
                        <span>Nasıl Oynanır</span>
                      </button>
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3"
                        onClick={() => {
                          setShowPreviousGames(true);
                          setShowMenu(false);
                        }}
                      >
                        <CalendarDays className="w-5 h-5" />
                        <span>Önceki Oyunlar</span>
                      </button>
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3 border-t border-slate-700 mt-1"
                        onClick={() => {
                          localStorage.removeItem(`wordle-game-${gameNumber}`);
                          setGuesses([]);
                          setGameState("playing");
                          setCurrentGuess("");
                          setMessage("");
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
                          <span>Kelimeyi Göster</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bottom row: Game info */}
          {gameState === "playing" && (
            <div className="flex items-center gap-4 text-sm font-semibold">
              <span>
                Oyun: <span className="text-emerald-400">#{gameNumber}</span>
                {gameNumber !== getTodaysGameNumber() && (
                  <span className="text-slate-500 ml-1">
                    ({getFormattedDateFromGameNumber(gameNumber)})
                  </span>
                )}
              </span>
              <span>
                Tahmin:{" "}
                <span className="text-slate-400">{guesses.length}/6</span>
              </span>
            </div>
          )}
        </header>

        {/* Success/Lost State */}
        {(gameState === "won" || gameState === "lost") && (
          <div
            className={`mb-6 bg-slate-800 rounded-lg p-6 text-center border-2 ${
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

            <div className="mb-3 flex items-center justify-center gap-4 text-sm font-semibold">
              <span className="text-slate-500">
                Oyun: <span className="text-emerald-400">#{gameNumber}</span>
                {gameNumber !== getTodaysGameNumber() && (
                  <span className="text-slate-600 ml-1">
                    ({getFormattedDateFromGameNumber(gameNumber)})
                  </span>
                )}
              </span>
              <span className="text-slate-500">
                Tahmin:{" "}
                <span className="text-slate-400">{guesses.length}/6</span>
              </span>
            </div>

            <p className="text-lg mb-4">
              {gameState === "lost" ? "Kelime" : "Kelimeyi buldunuz"}:{" "}
              <span
                className={`font-bold ${
                  gameState === "lost" ? "text-slate-300" : "text-emerald-500"
                }`}
              >
                {targetWord}
              </span>
            </p>

            <div className="flex flex-col gap-2">
              {mode === "levels" ? (
                <button
                  onClick={() => router.back()}
                  className="px-6 py-2 rounded-md bg-emerald-600 text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Map className="w-4 h-4" />
                  Bölümlere Devam Et
                </button>
              ) : (
                <button
                  onClick={() => setShowPreviousGames(true)}
                  className="px-6 py-2 rounded-md bg-emerald-600 text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Önceki Günleri Oyna
                </button>
              )}
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="mb-4 bg-slate-800 border border-slate-700 rounded-md px-4 py-3 text-center">
            <p className="text-sm text-slate-300">{message}</p>
          </div>
        )}

        {/* Invalid Word Toast */}
        {showInvalidWordToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-600 rounded-lg px-6 py-3 shadow-xl animate-fade-in">
            <p className="text-sm font-semibold text-slate-200 whitespace-nowrap">Kelime listesinde yok</p>
          </div>
        )}

        {/* Game Grid */}
        <div className="space-y-1.5 mb-6 mx-5 mt-4">
          {[...Array(6)].map((_, row) => {
            const guess = guesses[row] || [];
            const isCurrentRow = row === guesses.length;

            return (
              <div 
                key={row} 
                className={`flex gap-1.5 ${isCurrentRow && shakeRow ? 'animate-shake' : ''}`}
              >
                {[...Array(5)].map((_, col) => {
                  if (isCurrentRow) {
                    const letter = currentGuess[col] || "";
                    const isDeleting = col === deletingIndex;
                    return (
                      <div
                        key={`${col}-${letterAnimationKeys[col]}`}
                        className={`flex-1 aspect-square bg-slate-800 border-2 border-slate-600 rounded flex items-center justify-center text-white text-2xl font-bold ${
                          isDeleting ? "animate-letter-shrink" : letter ? "animate-letter-pop" : ""
                        }`}
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

        {/* Modals */}
        <HowToPlayModal
          isOpen={showHowToPlay}
          onClose={() => setShowHowToPlay(false)}
        />

        <PreviousGamesModal
          isOpen={showPreviousGames}
          onClose={() => setShowPreviousGames(false)}
          onSelectGame={(selectedGameNumber) => {
            setGameNumber(selectedGameNumber);
          }}
        />
      </div>
    </main>
  );
};

// Suspense wrapper for useSearchParams
export default function WordlePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    }>
      <Wordle />
    </Suspense>
  );
}

