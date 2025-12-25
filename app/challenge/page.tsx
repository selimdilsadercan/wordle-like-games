"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users, Swords, Wifi } from "lucide-react";
import AppBar from "@/components/AppBar";
import Header from "@/components/Header";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function ChallengePage() {
  const router = useRouter();
  const [isSearching, setIsSearching] = useState(false);
  const [odaId, setOdaId] = useState<string | null>(null);
  const [dots, setDots] = useState("");

  const joinQueue = useMutation(api.matchmaking.joinQueue);
  const leaveQueue = useMutation(api.matchmaking.leaveQueue);
  const matchStatus = useQuery(
    api.matchmaking.checkMatchStatus,
    odaId ? { odaId } : "skip"
  );
  const queueCount = useQuery(api.matchmaking.getQueueCount);

  // Loading dots animation
  useEffect(() => {
    if (!isSearching) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [isSearching]);

  // Match status check
  useEffect(() => {
    if (matchStatus?.status === "matched" && matchStatus.matchId) {
      // Eşleşme bulundu, match sayfasına yönlendir
      router.push(`/match/wordle?matchId=${matchStatus.matchId}&odaId=${odaId}`);
    }
  }, [matchStatus, odaId, router]);

  const handleStartSearch = async () => {
    setIsSearching(true);
    try {
      const result = await joinQueue();
      setOdaId(result.odaId);
      
      if (result.status === "matched" && result.matchId) {
        // Direkt eşleşme bulundu
        router.push(`/match/wordle?matchId=${result.matchId}&odaId=${result.odaId}`);
      }
    } catch (error) {
      console.error("Queue'ya katılırken hata:", error);
      setIsSearching(false);
    }
  };

  const handleCancelSearch = async () => {
    if (odaId) {
      await leaveQueue({ odaId });
    }
    setIsSearching(false);
    setOdaId(null);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Title Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 mb-4 shadow-lg shadow-red-500/30">
            <Swords className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Online Wordle</h2>
          <p className="text-slate-400 text-sm">
            Rakibinden önce kelimeyi bul ve kazan!
          </p>
        </div>

        {/* Game Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 mb-6">
          {/* Online Status */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">
              {queueCount !== undefined ? `${queueCount} oyuncu bekliyor` : "Çevrimiçi"}
            </span>
          </div>

          {/* Game Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">🎯</div>
              <p className="text-xs text-slate-400">Aynı Kelime</p>
              <p className="text-sm text-white font-medium">İki oyuncu aynı kelimeyi çözer</p>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">⚡</div>
              <p className="text-xs text-slate-400">Hız Yarışı</p>
              <p className="text-sm text-white font-medium">İlk bulan kazanır</p>
            </div>
          </div>

          {/* Action Button */}
          {!isSearching ? (
            <button
              onClick={handleStartSearch}
              className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white hover:from-orange-400 hover:via-red-400 hover:to-pink-400 shadow-lg shadow-red-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-center gap-3">
                <Users className="w-6 h-6" />
                <span>Rakip Bul</span>
              </div>
            </button>
          ) : (
            <div className="space-y-4">
              {/* Searching Animation */}
              <div className="bg-gradient-to-r from-orange-500/20 via-red-500/20 to-pink-500/20 rounded-xl p-6 border border-red-500/30">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-red-400 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Wifi className="w-5 h-5 text-red-300" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">
                      Rakip Aranıyor{dots}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      Eşleşme bekleniyor
                    </p>
                  </div>
                </div>
              </div>

              {/* Cancel Button */}
              <button
                onClick={handleCancelSearch}
                className="w-full py-3 rounded-xl font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              >
                İptal Et
              </button>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Nasıl Oynanır?</h3>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-orange-400">1.</span>
              <span>Rakip Bul butonuna bas ve eşleşmeyi bekle</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">2.</span>
              <span>İki oyuncu da aynı kelimeyi çözmeye çalışır</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-400">3.</span>
              <span>Kelimeyi ilk bulan oyuncu kazanır!</span>
            </li>
          </ul>
        </div>

        {/* Bottom Padding for AppBar */}
        <div className="h-24" />
      </main>

      {/* Bottom Navigation */}
      <AppBar currentPage="challenge" />
    </div>
  );
}
