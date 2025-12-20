"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import levelsData from "@/data/levels.json";

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
    return "bg-gradient-to-b from-yellow-400 to-yellow-500 border-yellow-600 shadow-lg shadow-yellow-500/30";
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
function LevelButton({ level, index, isFirst }: { level: Level; index: number; isFirst: boolean }) {
  const isLocked = level.status === "locked";
  const isChest = level.type === "chest";
  const isAvailable = level.status === "available";
  
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
          ${getLevelButtonStyle(level.status, level.type)}
          ${!isLocked ? "hover:scale-110 cursor-pointer" : ""}
        `}
      >
        {/* Inner glow effect for available */}
        {!isLocked && !isChest && (
          <div className="absolute inset-2 rounded-full bg-white/20" />
        )}
        
        {/* Level number badge */}
        <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-20
          ${isLocked ? "bg-slate-600 text-slate-400" : "bg-yellow-500 text-yellow-900"}
        `}>
          {level.id}
        </div>
        
        {/* Icon - Level emoji */}
        <div className="relative z-10 text-2xl md:text-3xl">
          {level.icon}
        </div>
        
        {/* Start tooltip - only for first available */}
        {isFirst && isAvailable && (
          <div className="absolute -top-16 left-1/2 animate-bounce-soft z-20">
            <div className="relative">
              <span className="bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-xl whitespace-nowrap shadow-lg block">
                BAŞLA
              </span>
              {/* Arrow pointing down */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-emerald-500" />
            </div>
          </div>
        )}
      </div>
      
      {/* Level name */}
      {!(isFirst && isAvailable) && (
        <span className="mt-2 text-xs text-slate-400 font-medium text-center max-w-[80px] truncate">
          {level.name}
        </span>
      )}
    </div>
  );

  // Wrap with Link if has gameId and not locked
  if (level.gameId && !isLocked) {
    return (
      <Link href={`/games/${level.gameId}`} className="block">
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
  const streak = 1; // This would come from localStorage or a state management solution
  const levels = levelsData.levels as Level[];

  // Scroll to bottom on mount (so first level is visible)
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" });
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <h1 className="flex text-lg font-black text-white tracking-tight">
              <span className="inline-block px-1 py-0.5 bg-white text-black rounded text-sm">E</span>
              <span className="inline-block px-1 py-0.5 bg-white text-black rounded text-sm mx-0.5">V</span>
              <span className="inline-block px-1 py-0.5 bg-white text-black rounded text-sm">E</span>
              <span className="inline-block px-1 py-0.5 bg-white text-black rounded text-sm mx-0.5">R</span>
              <span className="inline-block px-1 py-0.5 bg-white text-black rounded text-sm">Y</span>
              <span className="inline-block px-1 py-0.5 bg-slate-500 text-white rounded text-sm mx-0.5">D</span>
              <span className="inline-block px-1 py-0.5 bg-yellow-500 text-white rounded text-sm">L</span>
              <span className="inline-block px-1 py-0.5 bg-emerald-600 text-white rounded text-sm mx-0.5">E</span>
            </h1>
            
            {/* Streak */}
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-white font-bold text-sm">{streak}</span>
            </div>
          </div>
        </div>
      </div>

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
            />
          ))}
        </div>
        
        {/* Bottom padding */}
        <div className="h-10" />
      </div>
    </div>
  );
}
