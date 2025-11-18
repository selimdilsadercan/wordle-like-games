"use client";

import Link from "next/link";

const games = [
  {
    id: "wordle",
    name: "WORDLE",
    color: "from-green-500 to-emerald-600",
    textColor: "text-white",
    badge: null,
    description: "Guess the 5-letter word",
  },
  {
    id: "contexto",
    name: "CONTEXTO",
    color: "from-purple-500 to-pink-600",
    textColor: "text-white",
    badge: { text: "NEW!", color: "bg-red-500" },
    description: "Guess the word by context",
  },
  {
    id: "redactle",
    name: "REDACTLE",
    color: "from-blue-500 to-cyan-600",
    textColor: "text-white",
    badge: null,
    description: "Uncover the hidden article",
  },
  {
    id: "worldle",
    name: "WORLDLE",
    color: "from-yellow-400 to-orange-500",
    textColor: "text-white",
    badge: { text: "MOST POPULAR!", color: "bg-blue-400" },
    description: "Guess the country",
  },
  {
    id: "nerdle",
    name: "NERDLE",
    color: "from-indigo-500 to-purple-600",
    textColor: "text-white",
    badge: null,
    description: "Solve the math equation",
  },
  {
    id: "pokerdle",
    name: "POKERDLE",
    color: "from-red-500 to-rose-600",
    textColor: "text-white",
    badge: null,
    description: "Guess the poker hand",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-black/30 backdrop-blur-sm">
        <button className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/80 rounded-lg">
          <svg
            className="w-5 h-5 text-yellow-300"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
          </svg>
          <span className="text-white font-semibold">0</span>
        </div>
        <button className="px-3 py-1.5 bg-purple-600/80 rounded-lg text-white text-xs font-semibold hover:bg-purple-600 transition-colors">
          REMOVE ADS
        </button>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white text-center mb-2 drop-shadow-lg">
          Wordle-Like Games
        </h1>
        <p className="text-center text-purple-200 mb-8">
          Choose your favorite puzzle game
        </p>

        {/* Games Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/games/${game.id}`}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br ${game.color} p-4 shadow-xl hover:scale-105 transition-transform duration-300 cursor-pointer"
            >
              {/* Badge */}
              {game.badge && (
                <div
                  className={`absolute top-2 left-2 ${game.badge.color} text-white text-xs font-bold px-2 py-1 rounded-lg z-10 shadow-lg`}
                >
                  {game.badge.text}
                </div>
              )}

              {/* Game Content */}
              <div className="relative z-0">
                <h2
                  className={`text-xl font-bold mb-2 ${game.textColor} drop-shadow-md`}
                >
                  {game.name}
                </h2>
                <p className={`text-sm ${game.textColor} opacity-90`}>
                  {game.description}
                </p>

                {/* Decorative Pattern */}
                <div className="mt-4 h-24 bg-white/10 rounded-lg flex items-center justify-center">
                  <div className="text-4xl opacity-30">
                    {game.id === "wordle" && "🔤"}
                    {game.id === "contexto" && "💭"}
                    {game.id === "redactle" && "📄"}
                    {game.id === "worldle" && "🌍"}
                    {game.id === "nerdle" && "🔢"}
                    {game.id === "pokerdle" && "🃏"}
                  </div>
                </div>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300 rounded-2xl" />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
