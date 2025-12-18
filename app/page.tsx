"use client";

import Link from "next/link";
import { Play, Flame } from "lucide-react";

// Daily puzzle games for the grid
const dailyPuzzles = [
  { id: "wordle", name: "Wordle", icon: "🔤" },
  { id: "quordle", name: "Quordle", icon: "📝" },
  { id: "octordle", name: "Octordle", icon: "🎯" },
  { id: "nerdle", name: "Nerdle", icon: "🔢" },
  { id: "semantle", name: "Semantle", icon: "💭" },
  { id: "redactle", name: "Redactle", icon: "📄" },
  { id: "moviedle", name: "Moviedle", icon: "🎬" },
  { id: "pokerdle", name: "Pokerdle", icon: "🃏" },
];

// Featured games for large cards
const featuredGames = [
  {
    id: "wordle",
    name: "Wordle",
    description: "5 harfli kelimeyi tahmin et",
    bgColor: "bg-gradient-to-br from-emerald-500 to-emerald-700",
    icon: "🔤",
  },
  {
    id: "moviedle",
    name: "Moviedle",
    description: "Filmi ipuçlarından tahmin et",
    bgColor: "bg-gradient-to-br from-red-400 to-red-600",
    icon: "🎬",
  },
  {
    id: "quordle",
    name: "Quordle",
    description: "4 kelimeyi aynı anda tahmin et",
    bgColor: "bg-gradient-to-br from-purple-500 to-purple-700",
    icon: "📝",
  },
  {
    id: "semantle",
    name: "Semantle",
    description: "Bağlamdan kelimeyi tahmin et",
    bgColor: "bg-gradient-to-br from-pink-500 to-pink-700",
    icon: "💭",
  },
  {
    id: "nerdle",
    name: "Nerdle",
    description: "Matematik denklemini çöz",
    bgColor: "bg-gradient-to-br from-blue-500 to-blue-700",
    icon: "🔢",
  },
  {
    id: "octordle",
    name: "Octordle",
    description: "8 kelimeyi aynı anda tahmin et",
    bgColor: "bg-gradient-to-br from-orange-500 to-orange-700",
    icon: "🎯",
  },
  {
    id: "redactle",
    name: "Redactle",
    description: "Gizli makaleyi ortaya çıkar",
    bgColor: "bg-gradient-to-br from-yellow-500 to-yellow-700",
    icon: "📄",
  },
  {
    id: "pokerdle",
    name: "Pokerdle",
    description: "Poker elini tahmin et",
    bgColor: "bg-gradient-to-br from-cyan-500 to-cyan-700",
    icon: "🃏",
  },
];

// Get formatted date
function getFormattedDate(): string {
  const date = new Date();
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  return date.toLocaleDateString("tr-TR", options);
}

export default function Home() {
  const streak = 1; // This would come from localStorage or a state management solution

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="relative">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800/50 via-slate-900/30 to-black" />
        
        {/* Curved bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-black" style={{ 
          clipPath: "ellipse(75% 100% at 50% 100%)" 
        }} />

        <div className="relative z-10 px-4 pt-16 pb-24">
          {/* Logo Section */}
          <div className="text-center mb-6">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
              <span className="inline-block px-2 py-1 bg-white text-black rounded mx-0.5">E</span>
              <span className="inline-block px-2 py-1 bg-white text-black rounded mx-0.5">V</span>
              <span className="inline-block px-2 py-1 bg-white text-black rounded mx-0.5">E</span>
              <span className="inline-block px-2 py-1 bg-white text-black rounded mx-0.5">R</span>
              <span className="inline-block px-2 py-1 bg-white text-black rounded mx-0.5">Y</span>
              <span className="inline-block px-2 py-1 bg-emerald-500 text-white rounded mx-0.5">D</span>
              <span className="inline-block px-2 py-1 bg-yellow-500 text-white rounded mx-0.5">L</span>
              <span className="inline-block px-2 py-1 bg-slate-600 text-white rounded mx-0.5">E</span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg">
              Günlük kelime, mantık ve bulmaca oyunları
            </p>
          </div>

          {/* Streak Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/80 backdrop-blur-sm rounded-full border border-slate-700">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-white font-semibold">{streak} Gün Seri</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Puzzles Section */}
      <div className="px-4 -mt-16 relative z-20">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-white font-bold text-lg">GÜNLÜK BULMACALAR</h2>
            <span className="text-slate-400 text-sm">{getFormattedDate()}</span>
          </div>

          {/* 8-Game Grid */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3 mb-12">
            {dailyPuzzles.map((game) => (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className="group bg-slate-800/90 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-slate-700 hover:border-emerald-500 transition-all duration-300 hover:scale-105"
              >
                <div className="flex flex-col items-center">
                  <div className="text-2xl md:text-3xl mb-2 group-hover:scale-110 transition-transform">
                    {game.icon}
                  </div>
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-white truncate w-full text-center">
                    {game.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Explore Section Header */}
          <h2 className="text-white font-bold text-lg mb-4">OYUNLARI KEŞFET</h2>
        </div>
      </div>

      {/* Featured Game Cards */}
      <div className="px-4 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredGames.map((game) => (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className={`group relative ${game.bgColor} rounded-2xl p-6 min-h-[220px] overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl`}
              >
                {/* Game Icon - Large, positioned at top right */}
                <div className="absolute top-4 right-4 text-6xl opacity-90 group-hover:scale-110 transition-transform">
                  {game.icon}
                </div>

                {/* Content at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {game.name}
                  </h3>
                  <p className="text-white/80 text-sm mb-4">
                    {game.description}
                  </p>
                  
                  {/* Play Button */}
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full font-semibold text-sm hover:bg-slate-100 transition-colors">
                    <Play className="w-4 h-4 fill-current" />
                    Oyna
                  </button>
                </div>

                {/* Subtle overlay gradient for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
