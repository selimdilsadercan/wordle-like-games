"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, User, Trophy, XCircle } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type LetterState = "correct" | "present" | "absent" | "empty";

interface Letter {
  letter: string;
  state: LetterState;
}

const MatchWordle = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const matchIdStr = searchParams.get("matchId");
  const odaId = searchParams.get("odaId");
  
  const matchId = matchIdStr as Id<"matches"> | null;
  
  const [currentGuess, setCurrentGuess] = useState("");
  const [shakeRow, setShakeRow] = useState(false);
  const [showInvalidWordToast, setShowInvalidWordToast] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [allWords, setAllWords] = useState<string[]>([]);
  
  // Convex queries
  const match = useQuery(
    api.game.getMatch,
    matchId ? { matchId } : "skip"
  );
  
  const playerState = useQuery(
    api.game.getPlayerState,
    matchId && odaId ? { matchId, odaId } : "skip"
  );
  
  const opponentState = useQuery(
    api.game.getOpponentState,
    matchId && odaId ? { matchId, odaId } : "skip"
  );
  
  // Convex mutations
  const submitGuess = useMutation(api.game.submitGuess);
  
  // Timer
  useEffect(() => {
    if (!match || match.status !== "playing") return;
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - match.startedAt) / 1000);
      setElapsedTime(elapsed);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [match]);
  
  // Load valid words
  useEffect(() => {
    const loadWords = async () => {
      try {
        const response = await fetch("/wordle/all_5letters.txt");
        const text = await response.text();
        const wordList = text
          .split("\n")
          .map((w) => toTurkishUpperCase(w.trim()))
          .filter((w) => w.length === 5);
        setAllWords(wordList);
      } catch (err) {
        console.error("Kelimeler yüklenemedi:", err);
      }
    };
    loadWords();
  }, []);
  
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
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  const handleKeyPress = useCallback(
    async (key: string) => {
      if (!playerState || playerState.gameState !== "playing" || !matchId || !odaId) return;

      if (key === "Enter") {
        if (currentGuess.length === 5) {
          if (allWords.includes(currentGuess)) {
            const result = await submitGuess({
              matchId,
              odaId,
              guess: currentGuess,
            });
            
            if (result.success) {
              setCurrentGuess("");
            }
          } else {
            setShakeRow(true);
            setShowInvalidWordToast(true);
            setTimeout(() => setShakeRow(false), 600);
            setTimeout(() => setShowInvalidWordToast(false), 2000);
          }
        }
      } else if (key === "Backspace") {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (
        key.length === 1 &&
        /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(key) &&
        currentGuess.length < 5
      ) {
        let upperKey = key;
        if (key === "i" || key === "İ") upperKey = "İ";
        else if (key === "ı" || key === "I") upperKey = "I";
        else if (key === "ç" || key === "Ç") upperKey = "Ç";
        else if (key === "ğ" || key === "Ğ") upperKey = "Ğ";
        else if (key === "ö" || key === "Ö") upperKey = "Ö";
        else if (key === "ş" || key === "Ş") upperKey = "Ş";
        else if (key === "ü" || key === "Ü") upperKey = "Ü";
        else upperKey = key.toUpperCase();

        setCurrentGuess((prev) => prev + upperKey);
      }
    },
    [currentGuess, playerState, matchId, odaId, allWords, submitGuess]
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
    if (!playerState) return "bg-slate-700 text-slate-200";
    
    let hasCorrect = false;
    let hasPresent = false;
    let hasAbsent = false;

    playerState.guesses.forEach((guess) => {
      guess.forEach((letter) => {
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
  
  // Loading state
  if (!match || !playerState) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    );
  }
  
  // Game finished state
  if (match.status === "finished" || playerState.gameState !== "playing") {
    const isWinner = match.winnerId === odaId;
    const isLoser = match.winnerId && match.winnerId !== odaId;
    const isDraw = !match.winnerId && playerState.gameState === "lost";
    
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className={`text-center p-8 rounded-2xl border-2 ${
            isWinner 
              ? "bg-gradient-to-br from-emerald-900/50 to-emerald-800/30 border-emerald-500" 
              : isLoser 
                ? "bg-gradient-to-br from-red-900/50 to-red-800/30 border-red-500"
                : "bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-500"
          }`}>
            {isWinner ? (
              <>
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-emerald-400 mb-2">Kazandın!</h1>
                <p className="text-slate-300">Kelimeyi rakibinden önce buldun</p>
              </>
            ) : isLoser ? (
              <>
                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-red-400 mb-2">Kaybettin</h1>
                <p className="text-slate-300">Rakibin kelimeyi daha önce buldu</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 text-4xl mx-auto mb-4">😔</div>
                <h1 className="text-3xl font-bold text-slate-300 mb-2">Oyun Bitti</h1>
                <p className="text-slate-400">6 denemede bulamadın</p>
              </>
            )}
            
            <div className="mt-6 p-4 bg-slate-800/50 rounded-xl">
              <p className="text-sm text-slate-400 mb-1">Kelime:</p>
              <p className="text-2xl font-bold text-white tracking-widest">{match.targetWord}</p>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <p className="text-slate-400">Süre</p>
                <p className="text-lg font-bold text-white">{formatTime(elapsedTime)}</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <p className="text-slate-400">Tahmin</p>
                <p className="text-lg font-bold text-white">{playerState.guesses.length}/6</p>
              </div>
            </div>
            
            <button
              onClick={() => router.push("/challenge")}
              className="mt-6 w-full py-3 rounded-xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white"
            >
              Tekrar Oyna
            </button>
          </div>
        </div>
      </main>
    );
  }

  const guesses = playerState.guesses as Letter[][];

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-4 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <header className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push("/challenge")}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <h1 className="text-xl font-bold">Online Wordle</h1>

            {/* Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg">
              <Clock className="w-4 h-4 text-orange-400" />
              <span className="font-mono font-bold text-orange-400">{formatTime(elapsedTime)}</span>
            </div>
          </div>
          
          {/* Players Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 bg-emerald-900/30 rounded-lg border border-emerald-600/30">
              <User className="w-4 h-4 text-emerald-400" />
              <div className="flex-1">
                <p className="text-xs text-emerald-400">Sen</p>
                <p className="text-sm font-bold text-white">{guesses.length}/6 tahmin</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-red-900/30 rounded-lg border border-red-600/30">
              <User className="w-4 h-4 text-red-400" />
              <div className="flex-1">
                <p className="text-xs text-red-400">Rakip</p>
                <p className="text-sm font-bold text-white">
                  {opponentState ? `${opponentState.guessCount}/6 tahmin` : "Bekleniyor..."}
                </p>
              </div>
            </div>
          </div>
        </header>

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
                    return (
                      <div
                        key={col}
                        className={`flex-1 aspect-square bg-slate-800 border-2 border-slate-600 rounded flex items-center justify-center text-white text-2xl font-bold ${
                          letter ? "animate-letter-pop" : ""
                        }`}
                      >
                        {letter}
                      </div>
                    );
                  } else {
                    const letterData = guess[col] || { letter: "", state: "empty" as LetterState };
                    return (
                      <div
                        key={col}
                        className={`flex-1 aspect-square ${getLetterColor(letterData.state)} rounded flex items-center justify-center text-white text-2xl font-bold`}
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
                className={`keyboard-key flex-1 py-3.5 rounded text-xs sm:text-sm font-bold max-w-[36px] ${getKeyboardKeyColor(key)}`}
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
                className={`keyboard-key flex-1 py-3.5 rounded text-xs sm:text-sm font-bold max-w-[32px] ${getKeyboardKeyColor(key)}`}
              >
                {key}
              </button>
            ))}
          </div>
          {/* Üçüncü satır: ENTER Z C V B N M Ö Ç BACKSPACE */}
          <div className="flex gap-[3px] justify-center">
            <button
              onClick={() => handleKeyPress("Enter")}
              className="keyboard-key flex-[1.5] py-3 bg-gray-600 text-white rounded hover:bg-slate-400 transition-colors font-bold text-[10px] sm:text-xs max-w-[54px]"
            >
              ENTER
            </button>
            {["Z", "C", "V", "B", "N", "M", "Ö", "Ç"].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={`keyboard-key flex-1 py-3 rounded text-xs sm:text-sm font-bold max-w-[36px] ${getKeyboardKeyColor(key)}`}
              >
                {key}
              </button>
            ))}
            <button
              onClick={() => handleKeyPress("Backspace")}
              className="keyboard-key flex-[1.5] py-3 bg-gray-600 text-white rounded hover:bg-slate-500 transition-colors font-bold text-sm max-w-[54px]"
            >
              ⌫
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default function MatchWordlePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    }>
      <MatchWordle />
    </Suspense>
  );
}
