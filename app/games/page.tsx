"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, Users, Trophy, X } from "lucide-react";
import AppBar from "@/components/AppBar";
import Header from "@/components/Header";
import gamesData from "@/data/games.json";
import levelsData from "@/data/levels.json";
import { getCompletedGamesToday } from "@/lib/dailyCompletion";
import { getLevelProgress } from "@/lib/levelProgress";

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

interface Level {
  id: number;
  gameId?: string;
  type: string;
}

// Get games array from JSON
const games = Object.values(gamesData.games) as Game[];
const levels = levelsData.levels as Level[];

// Count total levels for each game
function getTotalLevelsForGame(gameId: string): number {
  return levels.filter(level => level.gameId === gameId).length;
}

// Count completed levels for each game
function getCompletedLevelsForGame(gameId: string, completedLevelIds: number[]): number {
  const gameLevels = levels.filter(level => level.gameId === gameId);
  return gameLevels.filter(level => completedLevelIds.includes(level.id)).length;
}

export default function GamesPage() {
  const [completedGames, setCompletedGames] = useState<string[]>([]);
  const [completedLevelIds, setCompletedLevelIds] = useState<number[]>([]);

  useEffect(() => {
    setCompletedGames(getCompletedGamesToday());
    const progress = getLevelProgress();
    setCompletedLevelIds(progress.completedLevels);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <Header />

      {/* Games Grid */}
      <main className="max-w-lg mx-auto px-4 py-6">

        {/* 2x4 Games Grid */}
        <div className="grid grid-cols-2 gap-3">
          {games.map((game) => {
            const isCompleted = completedGames.includes(game.id);
            const totalLevels = getTotalLevelsForGame(game.id);
            const completedLevels = getCompletedLevelsForGame(game.id, completedLevelIds);
            
            return (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className="block group"
              >
                <div
                  className={`
                    relative overflow-hidden rounded-2xl bg-slate-800 
                    border border-slate-700
                    shadow-[0_4px_0_0_rgba(0,0,0,0.3)] 
                    hover:shadow-[0_2px_0_0_rgba(0,0,0,0.3)] 
                    active:shadow-[0_1px_0_0_rgba(0,0,0,0.3)]
                    transform hover:translate-y-1 active:translate-y-2
                    transition-all duration-150 ease-out
                    p-3 h-40 cursor-pointer
                  `}
                >
                  {/* Completed Check or X */}
                  {isCompleted ? (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center z-10">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center z-10">
                      <X className="w-3 h-3 text-slate-400" strokeWidth={3} />
                    </div>
                  )}

                  <div className="flex flex-col items-center text-center">
                    {/* Icon */}
                    <div
                      className={`
                        w-12 h-12 rounded-lg bg-gradient-to-br ${game.color}
                        flex items-center justify-center text-2xl mb-2
                        shadow-md ${game.shadowColor}
                      `}
                    >
                      {game.icon}
                    </div>

                    {/* Name */}
                    <h3 className="text-sm font-bold text-white mb-0.5">
                      {game.name}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                      {game.description}
                    </p>

                    {/* Stats Row */}
                    <div className="flex items-center gap-3 text-[10px]">
                      {/* Players count */}
                      <div className="flex items-center gap-1 text-slate-500">
                        <Users className="w-3 h-3" />
                        <span>{game.players}</span>
                      </div>
                      
                      {/* Completed levels */}
                      <div className="flex items-center gap-1 text-slate-500">
                        <Trophy className="w-3 h-3" />
                        <span>{completedLevels}/{totalLevels}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom Padding for AppBar */}
        <div className="h-24" />
      </main>

      {/* Bottom Navigation */}
      <AppBar currentPage="games" />
    </div>
  );
}
