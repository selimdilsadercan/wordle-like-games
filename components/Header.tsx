"use client";

import { Lightbulb, Flag, MoreVertical, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { resetProgress } from "@/lib/levelProgress";

// Default values
const DEFAULT_HINTS = 3;
const DEFAULT_GIVEUPS = 1;

export default function Header() {
  const [hints, setHints] = useState(DEFAULT_HINTS);
  const [giveUps, setGiveUps] = useState(DEFAULT_GIVEUPS);
  const [showMenu, setShowMenu] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedHints = localStorage.getItem("everydle-hints");
    const savedGiveUps = localStorage.getItem("everydle-giveups");
    
    if (savedHints) setHints(parseInt(savedHints));
    if (savedGiveUps) setGiveUps(parseInt(savedGiveUps));
  }, []);

  const handleResetProgress = () => {
    resetProgress();
    setShowMenu(false);
    window.location.reload(); // Sayfayı yenile
  };

  return (
    <header className="sticky top-0 z-[100] bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
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
          
          {/* Right side: Counters + Debug Menu */}
          <div className="flex items-center gap-2">
            {/* Hints */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-full">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-bold text-sm">{hints}</span>
            </div>
            
            {/* Give Ups */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-full">
              <Flag className="w-4 h-4 text-red-400" />
              <span className="text-white font-bold text-sm">{giveUps}</span>
            </div>

            {/* Debug Menu - Only in development */}
            {process.env.NODE_ENV === "development" && (
              <div className="relative">
                <button
                  className="p-2 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <MoreVertical className="w-5 h-5 text-slate-400" />
                </button>

                {showMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMenu(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 top-12 w-56 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 z-50">
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-all flex items-center gap-3 text-red-400"
                        onClick={handleResetProgress}
                      >
                        <RotateCcw className="w-5 h-5" />
                        <span>İlerlemeyi Sıfırla</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// Helper functions to use hints/giveups from games
export function useHint(): boolean {
  const current = parseInt(localStorage.getItem("everydle-hints") || "3");
  if (current > 0) {
    localStorage.setItem("everydle-hints", (current - 1).toString());
    window.dispatchEvent(new Event("storage")); // Trigger update
    return true;
  }
  return false;
}

export function useGiveUp(): boolean {
  const current = parseInt(localStorage.getItem("everydle-giveups") || "1");
  if (current > 0) {
    localStorage.setItem("everydle-giveups", (current - 1).toString());
    window.dispatchEvent(new Event("storage")); // Trigger update
    return true;
  }
  return false;
}

export function addHints(count: number): void {
  const current = parseInt(localStorage.getItem("everydle-hints") || "3");
  localStorage.setItem("everydle-hints", (current + count).toString());
  window.dispatchEvent(new Event("storage"));
}

export function addGiveUps(count: number): void {
  const current = parseInt(localStorage.getItem("everydle-giveups") || "1");
  localStorage.setItem("everydle-giveups", (current + count).toString());
  window.dispatchEvent(new Event("storage"));
}
