"use client";

import Link from "next/link";
import { Star, Users } from "lucide-react";
import AppBar from "@/components/AppBar";
import Header from "@/components/Header";
import gamesData from "@/data/games.json";

// Game type
interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  borderColor: string;
  shadowColor: string;
  difficulty: string;
  players: string;
  isNew: boolean;
  isPopular: boolean;
}

// Get games array from JSON
const games = Object.values(gamesData.games) as Game[];

// Difficulty badge color
function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case "Kolay":
      return "bg-emerald-500/20 text-emerald-400";
    case "Orta":
      return "bg-yellow-500/20 text-yellow-400";
    case "Zor":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-slate-500/20 text-slate-400";
  }
}

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <Header />

      {/* Games Grid */}
      <main className="max-w-lg mx-auto px-4 py-6">

        {/* Games List */}
        <div className="space-y-4">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/games/${game.id}`}
              className="block group"
            >
              <div
                className={`
                  relative overflow-hidden rounded-2xl bg-slate-800 border border-slate-700
                  hover:border-slate-600 transition-all duration-300
                  hover:scale-[1.02] hover:shadow-xl ${game.shadowColor}
                `}
              >
                {/* Background Gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-10 group-hover:opacity-20 transition-opacity`}
                />

                <div className="relative p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`
                        w-16 h-16 rounded-xl bg-gradient-to-br ${game.color}
                        flex items-center justify-center text-3xl
                        shadow-lg ${game.shadowColor}
                      `}
                    >
                      {game.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white">
                          {game.name}
                        </h3>
                        {game.isNew && (
                          <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full uppercase">
                            Yeni
                          </span>
                        )}
                        {game.isPopular && (
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mb-3">
                        {game.description}
                      </p>

                      {/* Tags */}
                      <div className="flex items-center gap-1 text-slate-500 text-xs">
                        <Users className="w-3.5 h-3.5" />
                        <span>{game.players}</span>
                      </div>
                    </div>

                    {/* Play Arrow */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-700 group-hover:bg-emerald-500 transition-colors">
                      <svg
                        className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom Padding for AppBar */}
        <div className="h-24" />
      </main>

      {/* Bottom Navigation */}
      <AppBar currentPage="games" />
    </div>
  );
}
