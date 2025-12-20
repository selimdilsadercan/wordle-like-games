"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import levelsData from "@/data/levels.json";
import AppBar from "@/components/AppBar";
import Header from "@/components/Header";
import { getLevelProgress, LevelProgress } from "@/lib/levelProgress";

// Type definitions
interface Level {
  id: number;
  gameId?: string;
  type: "game" | "chest";
  status: "available" | "locked" | "completed";
  icon: string;
  name: string;
}

// Get level button style based on status and type
function getLevelButtonStyle(status: string, type: string) {
  if (status === "locked") {
    return "bg-slate-700 border-slate-600 cursor-not-allowed opacity-60";
  }
  
  if (status === "completed") {
    return "bg-gradient-to-b from-green-400 to-green-500 border-green-600 shadow-lg shadow-green-500/30";
  }
  
  // Available
  switch (type) {
    case "chest":
      return "bg-gradient-to-b from-purple-400 to-purple-500 border-purple-600 shadow-lg shadow-purple-500/30";
    default:
      return "bg-gradient-to-b from-emerald-400 to-emerald-500 border-emerald-600 shadow-lg shadow-emerald-500/40 hover:from-emerald-300 hover:to-emerald-400";
  }
}

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

// Level Button Component
function LevelButton({ level, index, isFirst, progress }: { level: Level; index: number; isFirst: boolean; progress: LevelProgress }) {
  // Dinamik durum hesapla
  const isCompleted = progress.completedLevels.includes(level.id);
  const isAvailable = level.id === progress.currentLevel || level.id < progress.currentLevel;
  const isLocked = !isCompleted && !isAvailable;
  const isChest = level.type === "chest";
  
  // Dinamik status hesapla
  const dynamicStatus = isCompleted ? "completed" : (isAvailable ? "available" : "locked");
  
  // Zigzag pattern - offset based on index
  const offsets = [0, 40, 60, 40, 0, -40, -60, -40];
  const xOffset = offsets[index % 8];
  
  const buttonContent = (
    <div className="relative flex flex-col items-center">
      
      {/* Level Button */}
      <div
        className={`
          relative w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-b-8
          flex items-center justify-center transition-all duration-300
          ${getLevelButtonStyle(dynamicStatus, level.type)}
          ${!isLocked ? "hover:scale-110 cursor-pointer" : ""}
        `}
      >
        {/* Inner glow effect for available */}
        {!isLocked && !isChest && (
          <div className="absolute inset-2 rounded-full bg-white/20" />
        )}
        
        {/* Level number badge */}
        <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-20
          ${isLocked ? "bg-slate-600 text-slate-400" : "bg-green-500 text-green-900"}
        `}>
          {level.id}
        </div>
        
        {/* Icon - Level emoji */}
        <div className="relative z-10 text-2xl md:text-3xl">
          {level.icon}
        </div>
        
        {/* Start tooltip - for current level */}
        {level.id === progress.currentLevel && !isLocked && (
          <div className="absolute -top-16 inset-x-0 flex justify-center z-20 pointer-events-none">
            <div className="animate-bounce-soft flex flex-col items-center opacity-100">
              <span className={`text-white text-sm font-bold px-4 py-2 rounded-xl whitespace-nowrap shadow-xl block ${
                isCompleted ? "bg-emerald-500" : "bg-green-500"
              }`}>
                BAŞLA
              </span>
              {/* Arrow pointing down */}
              <div className={`w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent -mt-0.5 ${
                isCompleted ? "border-t-emerald-500" : "border-t-green-500"
              }`} />
            </div>
          </div>
        )}
      </div>
      
      {/* Level name / description */}
      <span className="mt-2 text-[10px] text-slate-400 font-medium text-center max-w-[120px] leading-tight">
        {level.name}
      </span>
    </div>
  );

  // Wrap with Link if has gameId and not locked
  if (level.gameId && !isLocked) {
    return (
      <Link href={`/games/${level.gameId}?mode=levels&levelId=${level.id}`} className="block">
        <div style={{ transform: `translateX(${xOffset}px)` }} className="transition-transform">
          {buttonContent}
        </div>
      </Link>
    );
  }

  return (
    <div style={{ transform: `translateX(${xOffset}px)` }} className="transition-transform">
      {buttonContent}
    </div>
  );
}

export default function Home() {
  const levels = levelsData.levels as Level[];
  const [progress, setProgress] = useState<LevelProgress>({ currentLevel: 1, completedLevels: [], lastUpdated: "" });

  // Load progress on mount
  useEffect(() => {
    setProgress(getLevelProgress());
  }, []);

  // Scroll to bottom on mount (so first level is visible)
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" });
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content - Level Map */}
      <div className="flex-1 flex flex-col justify-end max-w-lg mx-auto w-full px-4 py-6">
        {/* Date */}
        <p className="text-center text-slate-400 text-sm mb-6">{getFormattedDate()}</p>
        
        {/* Levels - from bottom to top */}
        <div className="flex flex-col-reverse items-center gap-10 py-4">
          {levels.map((level, index) => (
            <LevelButton 
              key={level.id} 
              level={level} 
              index={index} 
              isFirst={index === 0}
              progress={progress}
            />
          ))}
        </div>
        
        {/* Bottom padding for AppBar */}
        <div className="h-24" />
      </div>

      {/* Bottom Navigation */}
      <AppBar currentPage="home" />
    </div>
  );
}

