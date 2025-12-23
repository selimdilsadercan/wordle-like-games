"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Users, Trophy, ChevronLeft, ChevronRight, Play } from "lucide-react";
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
  monthName: string;
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

// Wordle için first game date sabitleri
const WORDLE_FIRST_GAME_DATE = new Date(2025, 10, 23); // 23 Kasım 2025
const WORDLE_FIRST_GAME_NUMBER = 1;

// Tarihten oyun numarası hesapla
function getGameNumberFromDate(date: Date): number {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const firstDate = new Date(WORDLE_FIRST_GAME_DATE);
  firstDate.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor(
    (targetDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return WORDLE_FIRST_GAME_NUMBER + daysDiff;
}

// Belirli bir tarih için "devam ediyor" durumundaki oyunları bul
function getInProgressGamesForDate(date: Date): string[] {
  if (typeof window === "undefined") return [];
  
  const inProgressGames: string[] = [];
  const gameNumber = getGameNumberFromDate(date);
  
  // Wordle kontrolü
  const wordleSave = localStorage.getItem(`wordle-game-${gameNumber}`);
  if (wordleSave) {
    try {
      const parsed = JSON.parse(wordleSave);
      // Oyun başlamış (en az 1 tahmin var) ama bitmemiş (kazanılmamış veya kaybedilmemiş)
      if (parsed.guesses && parsed.guesses.length > 0 && !parsed.gameWon && !parsed.gameLost) {
        inProgressGames.push("wordle");
      }
    } catch (e) {}
  }
  
  // Diğer oyunlar için benzer kontroller eklenebilir
  // TODO: quordle, octordle, nerdle, vb. için kontrol ekle
  
  return inProgressGames;
}

// Parse date from URL param (format: YYYY-MM-DD) - handles timezone correctly
function parseDateParam(dateParam: string | null): Date | null {
  if (!dateParam) return new Date();
  
  // Parse YYYY-MM-DD format manually to avoid timezone issues
  const parts = dateParam.split('-');
  if (parts.length !== 3) return new Date();
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // months are 0-indexed
  const day = parseInt(parts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date();
  
  const parsed = new Date(year, month, day);
  if (isNaN(parsed.getTime())) return new Date();
  return parsed;
}

// Get Monday of the week for a given date
function getMondayOfWeek(date: Date): Date {
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function GamesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get initial date from URL param or use today
  const dateParam = searchParams.get("date");
  const initialDate = parseDateParam(dateParam);
  
  // Week start (Monday of current viewed week)
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(initialDate || new Date()));
  
  // Selected date (null means no day selected)
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
  const [completedGames, setCompletedGames] = useState<string[]>([]);
  const [inProgressGames, setInProgressGames] = useState<string[]>([]);
  const [completedLevelIds, setCompletedLevelIds] = useState<number[]>([]);

  // Update URL when date changes
  const updateSelectedDate = (newDate: Date | null) => {
    setSelectedDate(newDate);
    if (newDate) {
      const dateStr = formatDate(newDate);
      router.replace(`/games?date=${dateStr}`, { scroll: false });
    } else {
      router.replace("/games", { scroll: false });
    }
  };

  // Load completed and in-progress games when date changes
  useEffect(() => {
    if (selectedDate) {
      const dateStr = formatDate(selectedDate);
      setCompletedGames(getCompletedGamesForDate(dateStr));
      setInProgressGames(getInProgressGamesForDate(selectedDate));
    } else {
      setCompletedGames([]);
      setInProgressGames([]);
    }
    const progress = getLevelProgress();
    setCompletedLevelIds(progress.completedLevels);
  }, [selectedDate]);

  // Go to previous day (if Monday, go to previous week's Sunday)
  const goToPrevDay = () => {
    if (!selectedDate) return;
    
    const currentDayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const isMonday = currentDayOfWeek === 1;
    
    if (isMonday) {
      // Go to previous week and select Sunday
      const newWeekStart = new Date(weekStart);
      newWeekStart.setDate(weekStart.getDate() - 7);
      setWeekStart(newWeekStart);
      
      // Select Sunday of that week (6 days after Monday)
      const newSelectedDate = new Date(newWeekStart);
      newSelectedDate.setDate(newWeekStart.getDate() + 6);
      updateSelectedDate(newSelectedDate);
    } else {
      // Just go to previous day
      const newSelectedDate = new Date(selectedDate);
      newSelectedDate.setDate(selectedDate.getDate() - 1);
      updateSelectedDate(newSelectedDate);
    }
  };

  // Go to next day (if Sunday, go to next week's Monday)
  const goToNextDay = () => {
    if (!selectedDate) return;
    
    const todayStr = getTodayDate();
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + 1);
    
    // Can't go beyond today
    if (formatDate(nextDate) > todayStr) return;
    
    const currentDayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const isSunday = currentDayOfWeek === 0;
    
    if (isSunday) {
      // Go to next week and select Monday
      const newWeekStart = new Date(weekStart);
      newWeekStart.setDate(weekStart.getDate() + 7);
      setWeekStart(newWeekStart);
      updateSelectedDate(newWeekStart); // Monday is the first day
    } else {
      // Just go to next day
      updateSelectedDate(nextDate);
    }
  };

  // Check if can go to next day
  const canGoNextDay = () => {
    if (!selectedDate) return false;
    const todayStr = getTodayDate();
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + 1);
    return formatDate(nextDate) <= todayStr;
  };

  // Generate week days
  const getWeekDays = (): WeekDay[] => {
    const todayStr = getTodayDate();
    const dayNames = ["Pts", "Sal", "Çar", "Per", "Cum", "Cts", "Paz"];
    const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    const weekDays: WeekDay[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      weekDays.push({
        date,
        dayName: dayNames[i],
        dayNumber: date.getDate(),
        monthName: monthNames[date.getMonth()],
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
      <main className="max-w-lg mx-auto px-4 py-4">

        {/* Weekly Day Selector */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            {/* Previous day button */}
            <button
              onClick={goToPrevDay}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            
            {/* Week days */}
            <div className="flex-1 flex items-center gap-1">
              {weekDays.map((day, index) => (
                <button
                  key={index}
                  onClick={() => !day.isFuture && updateSelectedDate(day.date)}
                  disabled={day.isFuture}
                  className={`
                    flex-1 py-2 px-1 rounded-xl flex flex-col items-center gap-0.5 transition-all
                    ${day.isFuture 
                      ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-slate-700'
                    }
                  `}
                >
                  <span className={`text-[10px] font-medium ${day.isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>{day.dayName}</span>
                  <span className={`text-sm font-bold ${day.isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {day.dayNumber}
                  </span>
                  <span className={`text-[10px] font-bold -mt-1 ${day.isSelected ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {day.monthName}
                  </span>
                </button>
              ))}
            </div>
            
            {/* Next day button */}
            <button
              onClick={goToNextDay}
              disabled={!canGoNextDay()}
              className={`p-2 rounded-lg transition-colors ${
                canGoNextDay() 
                  ? 'bg-slate-800 hover:bg-slate-700' 
                  : 'bg-slate-800/50 cursor-not-allowed'
              }`}
            >
              <ChevronRight className={`w-4 h-4 ${canGoNextDay() ? 'text-slate-400' : 'text-slate-600'}`} />
            </button>
          </div>
        </div>

        {/* 2x4 Games Grid */}
        <div className="grid grid-cols-2 gap-3">
          {games.map((game) => {
            const isCompleted = completedGames.includes(game.id);
            const isInProgress = inProgressGames.includes(game.id);
            const totalLevels = getTotalLevelsForGame(game.id);
            const completedLevels = getCompletedLevelsForGame(game.id, completedLevelIds);
            
            return (
              <Link
                key={game.id}
                href={selectedDate ? `/games/${game.id}?mode=days&date=${formatDate(selectedDate)}` : `/games/${game.id}`}
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
                    p-3 h-fit cursor-pointer
                  `}
                >
                  {/* Status Indicator: Completed / In Progress / Not Started */}
                  {isCompleted ? (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center z-10">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  ) : isInProgress ? (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-yellow-600 flex items-center justify-center z-10">
                      <Play className="w-3 h-3 text-white" fill="white" />
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full border-2 border-slate-600 z-10" />
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

export default function GamesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-emerald-400 animate-pulse font-bold text-xl">Yükleniyor...</div>
      </div>
    }>
      <GamesContent />
    </Suspense>
  );
}
