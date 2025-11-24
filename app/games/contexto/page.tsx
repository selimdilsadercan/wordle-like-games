"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Lightbulb,
  Flag,
  Calendar,
  ArrowLeft,
  MoreVertical,
  ArrowRight,
  HelpCircle,
  CalendarDays,
  Settings,
  RotateCcw,
} from "lucide-react";
import ClosestWordsModal from "./ClosestWordsModal";
import HowToPlayModal from "./HowToPlayModal";

type WordEntry = {
  rank: number;
  word: string;
  similarity: number;
};

type Guess = {
  word: string;
  rank: number | null;
  similarity: number | null;
  status: "hit" | "inList" | "notFound";
};

export default function GemiContextoPage() {
  const [wordMap, setWordMap] = useState<Map<string, WordEntry> | null>(null);
  const [maxRank, setMaxRank] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [gameWon, setGameWon] = useState(false);
  const [showAllWords, setShowAllWords] = useState(false);
  const [lastGuessedWord, setLastGuessedWord] = useState<string | null>(null);
  const [gameNumber] = useState(2);
  const [showMenu, setShowMenu] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);

  // LocalStorage'dan oyun durumunu yükle
  useEffect(() => {
    const savedGame = localStorage.getItem("contexto-game");
    if (savedGame) {
      try {
        const parsed = JSON.parse(savedGame);
        if (parsed.gameNumber === gameNumber) {
          setGuesses(parsed.guesses || []);
          setGameWon(parsed.gameWon || false);
          setGaveUp(parsed.gaveUp || false);
          setHintsUsed(parsed.hintsUsed || 0);
          setLastGuessedWord(parsed.lastGuessedWord || null);
        }
      } catch (e) {
        console.error("Oyun verisi yüklenemedi:", e);
      }
    }
  }, [gameNumber]);

  // Oyun durumunu kaydet
  useEffect(() => {
    const gameState = {
      gameNumber,
      guesses,
      gameWon,
      gaveUp,
      hintsUsed,
      lastGuessedWord,
    };
    localStorage.setItem("contexto-game", JSON.stringify(gameState));
  }, [gameNumber, guesses, gameWon, gaveUp, hintsUsed, lastGuessedWord]);

  // JSON'u yükle
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("/word.json");
        if (!res.ok) throw new Error("JSON yüklenemedi");
        const data: WordEntry[] = await res.json();

        const map = new Map<string, WordEntry>();
        let maxR = 0;
        for (const item of data) {
          const key = item.word.toLowerCase();
          map.set(key, item);
          if (item.rank > maxR) maxR = item.rank;
        }
        setWordMap(map);
        setMaxRank(maxR);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wordMap) return;

    const raw = input.trim().toLowerCase();
    if (!raw) return;

    setInput("");

    // Aynı kelimeyi iki kere yazmasın
    if (guesses.some((g) => g.word === raw)) {
      return;
    }

    const entry = wordMap.get(raw);
    if (!entry) {
      setGuesses((prev) => [
        ...prev,
        { word: raw, rank: null, similarity: null, status: "notFound" },
      ]);
      setLastGuessedWord(raw);
      return;
    }

    const status: Guess["status"] = entry.rank === 1 ? "hit" : "inList";

    const newGuess: Guess = {
      word: entry.word,
      rank: entry.rank,
      similarity: entry.similarity,
      status,
    };

    setLastGuessedWord(entry.word);

    setGuesses((prev) => {
      const merged = [...prev, newGuess];
      // rank'ı olanları artan rank'a göre sırala, olmayanlar en alta
      return merged.sort((a, b) => {
        if (a.rank == null && b.rank == null) return 0;
        if (a.rank == null) return 1;
        if (b.rank == null) return -1;
        return a.rank - b.rank;
      });
    });

    // Game won if rank is 1
    if (entry.rank === 1) {
      setGameWon(true);
    }
  };

  const getBarColor = (rank: number | null, status: Guess["status"]) => {
    if (status === "notFound") return "bg-gray-600";
    if (status === "hit") return "bg-emerald-600";
    if (rank == null) return "bg-gray-600";

    if (rank <= 300) return "bg-emerald-600"; // yeşil
    if (rank <= 1500) return "bg-orange-500"; // turuncu
    return "bg-pink-500"; // pembe
  };

  const getBarWidth = (rank: number | null) => {
    if (rank == null || maxRank === 0) return "5%";

    const max = maxRank; // örn: 15000
    const threshold = 1000; // kırılma noktası
    const firstSegment = 10; // ilk %10
    const secondSegment = 90; // kalan %90

    // Güvenlik: maxRank 1000'den küçükse tamamen linear
    if (max <= threshold) {
      const t = (max - rank + 1) / max; // 0..1
      const width = firstSegment + secondSegment * t;
      return `${width.toFixed(0)}%`;
    }

    if (rank >= threshold) {
      // 15000 .. 1000  →  0 .. 10
      const t = (rank - threshold) / (max - threshold); // 0 (1000) .. 1 (max)
      const width = firstSegment * (1 - t); // 10 .. 0
      return `${width.toFixed(0)}%`;
    } else {
      // 1000 .. 1  →  10 .. 100
      const t = (threshold - rank) / (threshold - 1); // 0 (1000) .. 1 (1)
      const width = firstSegment + secondSegment * t; // 10 .. 100
      return `${width.toFixed(0)}%`;
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    );
  }

  if (!wordMap) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Veri yüklenemedi.</p>
      </main>
    );
  }

  // Get first 500 words sorted by rank for the "closest words" view
  const top500Words = wordMap
    ? Array.from(wordMap.values())
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 500)
    : [];

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-4 px-4">
      <div className="w-full max-w-md">
        <header className="mb-6">
          {/* Top row: Back button | Title | Menu */}
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="p-2 hover:bg-slate-800 rounded transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>

            <h1 className="text-2xl font-bold">CONTEXTO</h1>

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
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />

                  {/* Menu */}
                  <div className="absolute right-0 top-12 w-56 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 z-50">
                    <button
                      className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-3"
                      onClick={() => {
                        setShowHowToPlay(true);
                        setShowMenu(false);
                      }}
                    >
                      <HelpCircle className="w-5 h-5" />
                      <span>Nasıl Oynanır</span>
                    </button>
                    <button
                      className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 ${
                        gameWon || gaveUp
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-slate-700 cursor-pointer"
                      }`}
                      onClick={() => {
                        if (!wordMap || gameWon || gaveUp) return;

                        let targetRank: number;

                        // Eğer tahmin yoksa 300. kelimeyi göster
                        if (guesses.length === 0) {
                          targetRank = 300;
                        } else {
                          // En iyi tahmini bul (en düşük rank)
                          const validGuesses = guesses.filter(
                            (g) => g.rank !== null
                          );
                          if (validGuesses.length === 0) {
                            targetRank = 300;
                          } else {
                            const bestRank = Math.min(
                              ...validGuesses.map((g) => g.rank!)
                            );

                            // Özel durum: Eğer 2. kelime açılmışsa, açılmamış ilk kelimeyi ver
                            if (bestRank === 2) {
                              const openedRanks = new Set(
                                guesses
                                  .filter((g) => g.rank !== null)
                                  .map((g) => g.rank!)
                              );

                              // 3'ten başlayarak açılmamış ilk kelimeyi bul
                              targetRank = 3;
                              while (
                                openedRanks.has(targetRank) &&
                                targetRank < maxRank
                              ) {
                                targetRank++;
                              }
                            } else {
                              // Normal durum: En iyi tahmin ile 1 arasındaki ortayı bul
                              targetRank = Math.floor((1 + bestRank) / 2);
                            }
                          }
                        }

                        // wordMap'ten targetRank'e sahip kelimeyi bul
                        const hintEntry = Array.from(wordMap.values()).find(
                          (entry) => entry.rank === targetRank
                        );

                        if (hintEntry) {
                          // Kelime zaten tahmin edilmemişse ekle
                          if (!guesses.some((g) => g.word === hintEntry.word)) {
                            const newGuess: Guess = {
                              word: hintEntry.word,
                              rank: hintEntry.rank,
                              similarity: hintEntry.similarity,
                              status: hintEntry.rank === 1 ? "hit" : "inList",
                            };

                            setGuesses((prev) => {
                              const merged = [...prev, newGuess];
                              return merged.sort((a, b) => {
                                if (a.rank == null && b.rank == null) return 0;
                                if (a.rank == null) return 1;
                                if (b.rank == null) return -1;
                                return a.rank - b.rank;
                              });
                            });

                            setLastGuessedWord(hintEntry.word);
                          }
                        }

                        setHintsUsed((prev) => prev + 1);
                        setShowMenu(false);
                      }}
                    >
                      <Lightbulb className="w-5 h-5" />
                      <span>İpucu</span>
                    </button>
                    <button
                      className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 ${
                        gameWon || gaveUp
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-slate-700 cursor-pointer"
                      }`}
                      onClick={() => {
                        if (!wordMap || gameWon || gaveUp) return;

                        // Gizli kelimeyi (rank 1) bul
                        const secretWord = Array.from(wordMap.values()).find(
                          (entry) => entry.rank === 1
                        );

                        if (secretWord) {
                          // Gizli kelimeyi tahminlere ekle
                          const newGuess: Guess = {
                            word: secretWord.word,
                            rank: secretWord.rank,
                            similarity: secretWord.similarity,
                            status: "hit",
                          };

                          setGuesses((prev) => {
                            const merged = [...prev, newGuess];
                            return merged.sort((a, b) => {
                              if (a.rank == null && b.rank == null) return 0;
                              if (a.rank == null) return 1;
                              if (b.rank == null) return -1;
                              return a.rank - b.rank;
                            });
                          });

                          setLastGuessedWord(secretWord.word);
                          setGaveUp(true);
                        }

                        setShowMenu(false);
                      }}
                    >
                      <Flag className="w-5 h-5" />
                      <span>Pes Et</span>
                    </button>
                    <button className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-3">
                      <CalendarDays className="w-5 h-5" />
                      <span>Önceki Oyunlar</span>
                    </button>
                    <button className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-3">
                      <Settings className="w-5 h-5" />
                      <span>Ayarlar</span>
                    </button>
                    {/* Sadece development'ta göster */}
                    <button
                      className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-3 border-t border-slate-700"
                      onClick={() => {
                        localStorage.removeItem("contexto-game");
                        setGuesses([]);
                        setGameWon(false);
                        setGaveUp(false);
                        setHintsUsed(0);
                        setLastGuessedWord(null);
                        setShowMenu(false);
                      }}
                    >
                      <RotateCcw className="w-5 h-5" />
                      <span>Sıfırla</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom row: Game info - gizle oyun bitince */}
          {!gameWon && !gaveUp && (
            <div className="flex items-center gap-4 text-sm font-semibold">
              <span>
                Oyun: <span className="text-emerald-400">#{gameNumber}</span>
              </span>
              <span>
                Tahmin: <span className="text-slate-400">{guesses.length}</span>
              </span>
              <span>
                İpucu: <span className="text-yellow-400">{hintsUsed}</span>
              </span>
            </div>
          )}
        </header>

        {/* Success State */}
        {(gameWon || gaveUp) &&
          (() => {
            // Calculate guess counts by color category
            const greenCount = guesses.filter(
              (g) => g.rank !== null && g.rank <= 300
            ).length;
            const orangeCount = guesses.filter(
              (g) => g.rank !== null && g.rank > 300 && g.rank <= 1500
            ).length;
            const pinkCount = guesses.filter(
              (g) => g.rank !== null && g.rank > 1500
            ).length;

            return (
              <div
                className={`mb-10 bg-slate-800 rounded-lg p-6 text-center border-2 ${
                  gaveUp ? "border-slate-500" : "border-emerald-600"
                }`}
              >
                <h2
                  className={`text-2xl font-bold mb-3 ${
                    gaveUp ? "text-slate-300" : "text-emerald-500"
                  }`}
                >
                  {gaveUp ? "Bir dahaki sefere artık..." : "Tebrikler!"}
                </h2>

                {/* Oyun Bilgileri */}
                <div className="mb-3 flex items-center justify-center gap-4 text-sm font-semibold">
                  <span className="text-slate-500">
                    Oyun:{" "}
                    <span className="text-emerald-400">#{gameNumber}</span>
                  </span>
                  <span className="text-slate-500">
                    Tahmin:{" "}
                    <span className="text-slate-400">{guesses.length}</span>
                  </span>
                  <span className="text-slate-500">
                    İpucu: <span className="text-yellow-400">{hintsUsed}</span>
                  </span>
                </div>

                {/* Kelime */}
                <p className="text-lg mb-4">
                  {gaveUp ? "Kelime" : "Kelimeyi buldunuz"}:{" "}
                  <span
                    className={`font-bold ${
                      gaveUp ? "text-slate-300" : "text-emerald-500"
                    }`}
                  >
                    {guesses.find((g) => g.rank === 1)?.word.toUpperCase()}
                  </span>
                </p>

                {/* Guess Statistics - 15 guesses = 1 cube */}
                <div className="mb-4 space-y-2 max-w-md mx-auto flex flex-col items-center">
                  {/* Green */}
                  {greenCount > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {Array.from({
                          length: Math.ceil(greenCount / 15),
                        }).map((_, i) => (
                          <div key={i} className="w-4 h-4 bg-emerald-600"></div>
                        ))}
                      </div>
                      <span className="font-semibold text-sm min-w-[2rem] text-right">
                        {greenCount}
                      </span>
                    </div>
                  )}

                  {/* Orange */}
                  {orangeCount > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {Array.from({
                          length: Math.ceil(orangeCount / 15),
                        }).map((_, i) => (
                          <div key={i} className="w-4 h-4 bg-orange-500"></div>
                        ))}
                      </div>
                      <span className="font-semibold text-sm min-w-[2rem] text-right">
                        {orangeCount}
                      </span>
                    </div>
                  )}

                  {/* Pink */}
                  {pinkCount > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {Array.from({
                          length: Math.ceil(pinkCount / 15),
                        }).map((_, i) => (
                          <div key={i} className="w-4 h-4 bg-pink-500"></div>
                        ))}
                      </div>
                      <span className="font-semibold text-sm min-w-[2rem] text-right">
                        {pinkCount}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowAllWords(true)}
                  className="px-6 py-2 rounded-md bg-slate-700 text-sm font-semibold hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  En Yakın Kelimeleri Göster
                </button>
              </div>
            );
          })()}

        {/* Input Form - only show if game not won */}
        {!gameWon && !gaveUp && (
          <form onSubmit={handleSubmit} className="mb-6">
            <input
              type="text"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-4 py-4 text-base outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 placeholder:text-slate-500 transition-all"
              placeholder="Bir kelime yaz..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </form>
        )}

        {/* Modal for Closest Words */}
        <ClosestWordsModal
          isOpen={showAllWords}
          onClose={() => setShowAllWords(false)}
          words={top500Words}
          getBarColor={getBarColor}
          getBarWidth={getBarWidth}
        />

        {/* How to Play Modal */}
        <HowToPlayModal
          isOpen={showHowToPlay}
          onClose={() => setShowHowToPlay(false)}
        />

        {/* Guesses Section */}
        <section className="space-y-3">
          {guesses.length === 0 && !gameWon && !gaveUp && (
            <p className="text-sm text-slate-500">
              Tahmin yapmaya başla. En yakın kelimeler yukarıda listelenecek.
            </p>
          )}

          {guesses.map((g) => {
            const barColor = getBarColor(g.rank, g.status);
            const barWidth = getBarWidth(g.rank);
            const isLastGuess = g.word === lastGuessedWord;

            return (
              <div
                key={g.word}
                className={`bg-slate-800 rounded-md ${
                  isLastGuess ? "border-2 border-white" : ""
                }`}
              >
                <div className="relative h-10 flex items-center">
                  {/* Bar: sadece arka plan, width rank'e göre */}
                  <div
                    className={`absolute inset-y-0 left-0 rounded-md ${barColor}`}
                    style={{ width: barWidth, maxWidth: "100%" }}
                  />

                  {/* İçerik: kelime solda, rank sağda, TAMAMI barın üstünde */}
                  <div className="relative z-10 flex w-full items-center justify-between px-3 text-base font-semibold">
                    <span>{g.word}</span>
                    <span className="font-mono">
                      {g.rank != null ? g.rank : "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
