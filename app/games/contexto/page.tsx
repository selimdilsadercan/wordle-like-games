"use client";

import React, { useEffect, useState } from "react";

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

  // JSON'u yükle
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("/gemi_sorted.json");
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
      return;
    }

    const status: Guess["status"] =
      entry.rank === 1 ? "hit" : "inList";

    const newGuess: Guess = {
      word: entry.word,
      rank: entry.rank,
      similarity: entry.similarity,
      status,
    };

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
  };

  const getBarColor = (rank: number | null, status: Guess["status"]) => {
    if (status === "notFound") return "bg-gray-600";
    if (status === "hit") return "bg-emerald-500";
    if (rank == null) return "bg-gray-600";

    if (rank <= 500) return "bg-emerald-500"; // yeşil
    if (rank <= 2000) return "bg-orange-500"; // turuncu
    return "bg-pink-500"; // pembe
  };

const getBarWidth = (rank: number | null) => {
  if (rank == null || maxRank === 0) return "5%";

  const max = maxRank;          // örn: 15000
  const threshold = 1000;       // kırılma noktası
  const firstSegment = 10;      // ilk %10
  const secondSegment = 90;     // kalan %90

  // Güvenlik: maxRank 1000'den küçükse tamamen linear
  if (max <= threshold) {
    const t = (max - rank + 1) / max; // 0..1
    const width = firstSegment + secondSegment * t;
    return `${width.toFixed(0)}%`;
  }

  if (rank >= threshold) {
    // 15000 .. 1000  →  0 .. 10
    const t = (rank - threshold) / (max - threshold); // 0 (1000) .. 1 (max)
    const width = firstSegment * (1 - t);              // 10 .. 0
    return `${width.toFixed(0)}%`;
  } else {
    // 1000 .. 1  →  10 .. 100
    const t = (threshold - rank) / (threshold - 1); // 0 (1000) .. 1 (1)
    const width = firstSegment + secondSegment * t;  // 10 .. 100
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

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-xl">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Contexto</h1>
          <p className="text-sm text-slate-400 mt-1">
            Gizli kelimeyi bulmaya çalış.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Toplam kelime: {maxRank} • Tahmin sayın: {guesses.length}
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mb-6 flex gap-2 items-center"
        >
          <input
            type="text"
            className="flex-1 rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            placeholder="Bir kelime yaz..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-emerald-500 text-sm font-semibold hover:bg-emerald-400 transition-colors"
          >
            Tahmin
          </button>
        </form>

        <section className="space-y-2">
          {guesses.length === 0 && (
            <p className="text-sm text-slate-500">
              Tahmin yapmaya başla. En yakın kelimeler yukarıda listelenecek.
            </p>
          )}

          {guesses.map((g) => {
            const barColor = getBarColor(g.rank, g.status);
            const barWidth = getBarWidth(g.rank);

            return (
              <div
                key={g.word}
                className="bg-slate-800 rounded-md px-2 py-1"
              >
                <div className="relative h-7 flex items-center">
                  {/* Bar: sadece arka plan, width rank'e göre */}
                  <div
                    className={`absolute inset-y-0 left-0 rounded-md ${barColor}`}
                    style={{ width: barWidth, maxWidth: "100%" }}
                  />

                  {/* İçerik: kelime solda, rank sağda, TAMAMI barın üstünde */}
                  <div className="relative z-10 flex w-full items-center justify-between px-3 text-sm font-semibold">
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
