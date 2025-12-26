"use client";

import { useState, useEffect } from "react";
import { Trophy, Settings, LogOut, Gamepad2, Swords } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import AppBar from "@/components/AppBar";
import Header from "@/components/Header";

// Cihaz ID'si al
function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("wordleDeviceId") || "";
}

export default function ProfilePage() {
  const gamesPlayed = 12;
  const gamesWon = 8;
  const [deviceId, setDeviceId] = useState<string>("");

  // Cihaz ID'sini al
  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  // Convex kullanıcısını sorgula
  const convexUser = useQuery(
    api.users.getUserByDeviceId,
    deviceId ? { deviceId } : "skip"
  );

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <Header />

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

          {/* Online Wordle Username */}
          {convexUser && (
            <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 rounded-xl p-4 mb-6 border border-orange-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <Swords className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Online Wordle Adı</p>
                  <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-pink-400">
                    {convexUser.username}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded-xl p-4 text-center">
              <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{gamesWon}</p>
              <p className="text-xs text-slate-400">Kazanılan</p>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4 text-center">
              <Gamepad2 className="w-6 h-6 text-blue-500 mx-auto mb-2" />
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
