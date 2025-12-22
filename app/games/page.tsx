"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, Users, Trophy, X, ChevronLeft, ChevronRight } from "lucide-react";
import AppBar from "@/components/AppBar";
import Header from "@/components/Header";
import gamesData from "@/data/games.json";
import levelsData from "@/data/levels.json";
import { getCompletedGamesForDate, formatDate, getTodayDate } from "@/lib/dailyCompletion";
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

interface WeekDay {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isFuture: boolean;
  isSelected: boolean;
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
  // Week start (Monday of current viewed week)
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  
  // Selected date (null means no day selected)
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [completedGames, setCompletedGames] = useState<string[]>([]);
  const [completedLevelIds, setCompletedLevelIds] = useState<number[]>([]);

  // Load completed games when date changes
  useEffect(() => {
    if (selectedDate) {
      const dateStr = formatDate(selectedDate);
      setCompletedGames(getCompletedGamesForDate(dateStr));
    } else {
      setCompletedGames([]);
    }
    const progress = getLevelProgress();
    setCompletedLevelIds(progress.completedLevels);
  }, [selectedDate]);

  // Go to previous week
  const goToPrevWeek = () => {
    const newWeekStart = new Date(weekStart);
    newWeekStart.setDate(weekStart.getDate() - 7);
    setWeekStart(newWeekStart);
  };

  // Go to next week
  const goToNextWeek = () => {
    const todayStr = getTodayDate();
    const nextWeekMonday = new Date(weekStart);
    nextWeekMonday.setDate(weekStart.getDate() + 7);
    
    if (formatDate(nextWeekMonday) <= todayStr) {
      setWeekStart(nextWeekMonday);
    }
  };

  // Check if can go to next week
  const canGoNextWeek = () => {
    const todayStr = getTodayDate();
    const nextWeekMonday = new Date(weekStart);
    nextWeekMonday.setDate(weekStart.getDate() + 7);
    return formatDate(nextWeekMonday) <= todayStr;
  };

  // Generate week days
  const getWeekDays = (): WeekDay[] => {
    const todayStr = getTodayDate();
    const dayNames = ["Pts", "Sal", "Çar", "Per", "Cum", "Cts", "Paz"];
    const weekDays: WeekDay[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      weekDays.push({
        date,
        dayName: dayNames[i],
        dayNumber: date.getDate(),
        isToday: formatDate(date) === todayStr,
        isFuture: formatDate(date) > todayStr,
        isSelected: selectedDate ? formatDate(date) === formatDate(selectedDate) : false
      });
    }
    
    return weekDays;
  };

  const weekDays = getWeekDays();

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <Header />

      {/* Games Grid */}
      <main className="max-w-lg mx-auto px-4 py-6">

        {/* Weekly Day Selector */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            {/* Previous week button */}
            <button
              onClick={goToPrevWeek}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            
            {/* Week days */}
            <div className="flex-1 flex items-center gap-1">
              {weekDays.map((day, index) => (
                <button
                  key={index}
                  onClick={() => !day.isFuture && setSelectedDate(day.date)}
                  disabled={day.isFuture}
                  className={`
                    flex-1 py-2 px-1 rounded-xl flex flex-col items-center gap-0.5 transition-all
                    ${day.isFuture 
                      ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-slate-700'
                    }
                    ${day.isToday && !day.isSelected ? 'ring-2 ring-emerald-500/50' : ''}
                  `}
                >
                  <span className={`text-[10px] font-medium ${day.isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>{day.dayName}</span>
                  <span className={`text-sm font-bold ${day.isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {day.dayNumber}
                  </span>
                </button>
              ))}
            </div>
            
            {/* Next week button */}
            <button
              onClick={goToNextWeek}
              disabled={!canGoNextWeek()}
              className={`p-2 rounded-lg transition-colors ${
                canGoNextWeek() 
                  ? 'bg-slate-800 hover:bg-slate-700' 
                  : 'bg-slate-800/50 cursor-not-allowed'
              }`}
            >
              <ChevronRight className={`w-4 h-4 ${canGoNextWeek() ? 'text-slate-400' : 'text-slate-600'}`} />
            </button>
          </div>
        </div>

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
                    <p className="text-[12px] text-slate-400 line-clamp-1 mb-2">
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
        <div className="h-14" />
      </main>

      {/* Bottom Navigation */}
      <AppBar currentPage="games" />
    </div>
  );
}
