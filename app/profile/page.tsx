"use client";

import { Flame, Trophy, Calendar, Settings, LogOut } from "lucide-react";
import AppBar from "@/components/AppBar";

export default function ProfilePage() {
  const streak = 1;
  const gamesPlayed = 12;
  const gamesWon = 8;
  const joinDate = "Aralık 2024";

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
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
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Profile Card */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-6 border border-slate-700">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-4xl mb-4 shadow-lg shadow-emerald-500/30">
              👤
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Oyuncu</h2>
            <p className="text-slate-400 text-sm">Everydle üyesi</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-700/50 rounded-xl p-4 text-center">
              <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{streak}</p>
              <p className="text-xs text-slate-400">Seri</p>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4 text-center">
              <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{gamesWon}</p>
              <p className="text-xs text-slate-400">Kazanılan</p>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4 text-center">
              <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{gamesPlayed}</p>
              <p className="text-xs text-slate-400">Oynanan</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          <button className="w-full flex items-center gap-4 bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
              <Settings className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-medium">Ayarlar</p>
              <p className="text-sm text-slate-400">Uygulama ayarları</p>
            </div>
          </button>

          <button className="w-full flex items-center gap-4 bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-medium">Başarılar</p>
              <p className="text-sm text-slate-400">Kazanılan rozetler</p>
            </div>
          </button>

          <button className="w-full flex items-center gap-4 bg-slate-800 rounded-xl p-4 border border-red-900/30 hover:border-red-800/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-red-400 font-medium">Çıkış Yap</p>
              <p className="text-sm text-slate-500">Hesaptan çıkış yap</p>
            </div>
          </button>
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-dashed border-slate-700 text-center">
          <p className="text-slate-400 text-sm">
            🚧 Profil özellikleri yakında eklenecek
          </p>
        </div>

        {/* Bottom Padding for AppBar */}
        <div className="h-24" />
      </main>

      {/* Bottom Navigation */}
      <AppBar currentPage="profile" />
    </div>
  );
}
