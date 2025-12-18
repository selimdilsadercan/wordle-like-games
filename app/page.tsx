"use client";

import Link from "next/link";

const games = [
  {
    id: "moviedle",
    name: "MOVIEDLE",
    icon: "🎬",
    badge: { text: "YENİ!", color: "bg-red-500" },
    description: "Filmi ipuçlarından tahmin et",
  },
  {
    id: "contexto",
    name: "CONTEXTO",
    icon: "💭",
    badge: null,
    description: "Bağlamdan kelimeyi tahmin et",
  },
  {
    id: "redactle",
    name: "REDACTLE",
    icon: "📄",
    badge: null,
    description: "Gizli makaleyi ortaya çıkar",
  },
  {
    id: "wordle",
    name: "WORDLE",
    icon: "🔤",
    badge: null,
    description: "5 harfli kelimeyi tahmin et",
  },
  {
    id: "worldle",
    name: "WORLDLE",
    icon: "🌍",
    badge: { text: "EN POPÜLER!", color: "bg-cyan-500" },
    description: "Ülkeyi tahmin et",
  },
  {
    id: "nerdle",
    name: "NERDLE",
    icon: "🔢",
    badge: null,
    description: "Matematik denklemini çöz",
  },
  {
    id: "pokerdle",
    name: "POKERDLE",
    icon: "🃏",
    badge: null,
    description: "Poker elini tahmin et",
  },
  {
    id: "quordle",
    name: "QUORDLE",
    icon: "🔤🔤🔤🔤",
    badge: { text: "YENİ!", color: "bg-purple-500" },
    description: "4 kelimeyi aynı anda tahmin et",
  },
  {
    id: "octordle",
    name: "OCTORDLE",
    icon: "🔤🔤🔤🔤🔤🔤🔤🔤",
    badge: { text: "YENİ!", color: "bg-orange-500" },
    description: "8 kelimeyi aynı anda tahmin et",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-center px-4 py-6 border-b border-slate-800">
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow-lg">
          <svg
            className="w-5 h-5 text-yellow-300"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
          </svg>
          <span className="text-white font-bold text-lg">0</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-3">
            Wordle-Like Games
          </h1>
          <p className="text-slate-400 text-lg">
            En sevdiğin bulmaca oyununu seç
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/games/${game.id}`}
              className="group relative bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-emerald-500 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-emerald-500/20"
            >
              {/* Badge */}
              {game.badge && (
                <div
                  className={`absolute top-3 right-3 ${game.badge.color} text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-md`}
                >
                  {game.badge.text}
                </div>
              )}

              {/* Game Icon */}
              <div className="mb-4 flex items-center justify-center h-20 w-20 mx-auto bg-slate-700 rounded-2xl text-4xl group-hover:scale-110 transition-transform duration-300">
                {game.icon}
              </div>

              {/* Game Info */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                  {game.name}
                </h2>
                <p className="text-slate-400 text-sm">{game.description}</p>
              </div>

              {/* Hover Indicator */}
              <div className="mt-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-emerald-400 text-sm font-semibold">
                  Oyna →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
