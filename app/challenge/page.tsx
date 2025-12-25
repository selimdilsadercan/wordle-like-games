"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users, Swords, Wifi, X, User, Zap } from "lucide-react";
import AppBar from "@/components/AppBar";
import Header from "@/components/Header";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Cihaz ID'si oluştur veya al
function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  
  let deviceId = localStorage.getItem("wordleDeviceId");
  if (!deviceId) {
    deviceId = "device_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem("wordleDeviceId", deviceId);
  }
  return deviceId;
}

export default function ChallengePage() {
  const router = useRouter();
  const [isSearching, setIsSearching] = useState(false);
  const [odaId, setOdaId] = useState<string | null>(null);
  const [dots, setDots] = useState("");
  const [deviceId, setDeviceId] = useState<string>("");
  
  // Username modal state
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  
  // VS screen state
  const [showVsScreen, setShowVsScreen] = useState(false);
  const [myUsername, setMyUsername] = useState("");
  const [opponentUsername, setOpponentUsername] = useState("");
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const [vsCountdown, setVsCountdown] = useState(3);

  const joinQueue = useMutation(api.matchmaking.joinQueue);
  const leaveQueue = useMutation(api.matchmaking.leaveQueue);
  const registerUser = useMutation(api.users.registerUser);
  
  const matchStatus = useQuery(
    api.matchmaking.checkMatchStatus,
    odaId ? { odaId } : "skip"
  );
  const queueCount = useQuery(api.matchmaking.getQueueCount);
  
  // Cihaz bilgisine göre kullanıcı sorgula
  const existingUser = useQuery(
    api.users.getUserByDeviceId,
    deviceId ? { deviceId } : "skip"
  );

  // Cihaz ID'sini al
  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  // Loading dots animation
  useEffect(() => {
    if (!isSearching) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [isSearching]);

  // Match status check - VS ekranı göster
  useEffect(() => {
    if (matchStatus?.status === "matched" && matchStatus.matchId && !showVsScreen) {
      // Eşleşme bulundu, VS ekranı göster
      setMyUsername(matchStatus.myUsername || "");
      setOpponentUsername(matchStatus.opponentUsername || "");
      setPendingMatchId(matchStatus.matchId);
      setShowVsScreen(true);
      setIsSearching(false);
    }
  }, [matchStatus, showVsScreen]);

  // VS countdown
  useEffect(() => {
    if (!showVsScreen || !pendingMatchId) return;
    
    if (vsCountdown === 0) {
      router.push(`/match/wordle?matchId=${pendingMatchId}&odaId=${odaId}`);
      return;
    }
    
    const timer = setTimeout(() => {
      setVsCountdown((prev) => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [showVsScreen, vsCountdown, pendingMatchId, odaId, router]);

  const handleStartSearch = async () => {
    // DeviceId henüz yüklenmemişse bekle
    if (!deviceId) return;
    
    // existingUser sorgusu henüz tamamlanmadıysa (undefined) bekle
    // null ise kullanıcı yok demek, modal göster
    if (existingUser === undefined) {
      // Sorgu henüz yükleniyor, kısa süre bekleyip tekrar dene
      return;
    }
    
    // Kullanıcı yoksa modal göster
    if (existingUser === null) {
      setShowUsernameModal(true);
      return;
    }
    
    // Kullanıcı varsa aramaya başla
    startSearchWithUsername(existingUser.username);
  };
  
  const startSearchWithUsername = async (username: string) => {
    setIsSearching(true);
    try {
      const result = await joinQueue({ username });
      setOdaId(result.odaId);
      setMyUsername(result.myUsername || username);
      
      if (result.status === "matched" && result.matchId) {
        // Direkt eşleşme bulundu - VS ekranı göster
        setOpponentUsername(result.opponentUsername || "");
        setPendingMatchId(result.matchId);
        setShowVsScreen(true);
        setIsSearching(false);
      }
    } catch (error) {
      console.error("Queue'ya katılırken hata:", error);
      setIsSearching(false);
    }
  };

  const handleUsernameSubmit = async () => {
    if (!usernameInput.trim()) {
      setUsernameError("Kullanıcı adı boş olamaz");
      return;
    }
    
    if (usernameInput.length < 3) {
      setUsernameError("Kullanıcı adı en az 3 karakter olmalı");
      return;
    }
    
    if (usernameInput.length > 15) {
      setUsernameError("Kullanıcı adı en fazla 15 karakter olabilir");
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(usernameInput)) {
      setUsernameError("Sadece harf, rakam ve alt çizgi kullanabilirsiniz");
      return;
    }
    
    setIsCheckingUsername(true);
    setUsernameError("");
    
    try {
      const result = await registerUser({
        username: usernameInput,
        deviceId: deviceId,
      });
      
      if (result.success) {
        setShowUsernameModal(false);
        startSearchWithUsername(result.username || usernameInput.toUpperCase());
      } else {
        setUsernameError(result.error || "Bir hata oluştu");
      }
    } catch (error) {
      setUsernameError("Bir hata oluştu, tekrar deneyin");
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleCancelSearch = async () => {
    if (odaId) {
      await leaveQueue({ odaId });
    }
    setIsSearching(false);
    setOdaId(null);
  };

  // VS Screen
  if (showVsScreen) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          {/* VS Animation Container */}
          <div className="relative">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-transparent to-red-500/20 blur-3xl" />
            
            {/* Players */}
            <div className="relative grid grid-cols-3 items-center gap-4 py-8">
              {/* Player 1 (Me) */}
              <div className="animate-slide-in-left">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30">
                  <User className="w-10 h-10 text-white" />
                </div>
                <p className="text-emerald-400 font-bold text-lg truncate px-2">
                  {myUsername}
                </p>
                <p className="text-emerald-400/60 text-xs">SEN</p>
              </div>
              
              {/* VS Badge */}
              <div className="animate-scale-in">
                <div className="relative">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -inset-2 rounded-full border-2 border-red-500/30 animate-ping" />
                </div>
                <p className="text-white font-black text-2xl mt-2">VS</p>
              </div>
              
              {/* Player 2 (Opponent) */}
              <div className="animate-slide-in-right">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center mb-3 shadow-lg shadow-red-500/30">
                  <User className="w-10 h-10 text-white" />
                </div>
                <p className="text-red-400 font-bold text-lg truncate px-2">
                  {opponentUsername}
                </p>
                <p className="text-red-400/60 text-xs">RAKİP</p>
              </div>
            </div>
            
            {/* Countdown */}
            <div className="mt-8">
              <p className="text-slate-400 text-sm mb-2">Maç başlıyor</p>
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-500/50">
                <span className="text-white font-black text-4xl">{vsCountdown}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Custom animations */}
        <style jsx>{`
          @keyframes slide-in-left {
            from { opacity: 0; transform: translateX(-50px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes slide-in-right {
            from { opacity: 0; transform: translateX(50px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes scale-in {
            from { opacity: 0; transform: scale(0); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-slide-in-left {
            animation: slide-in-left 0.5s ease-out forwards;
          }
          .animate-slide-in-right {
            animation: slide-in-right 0.5s ease-out forwards;
          }
          .animate-scale-in {
            animation: scale-in 0.5s ease-out 0.3s forwards;
            opacity: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Username Modal */}
      {showUsernameModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Kullanıcı Adı</h2>
              <button
                onClick={() => setShowUsernameModal(false)}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-slate-400 text-sm mb-4">
                Online maçlarda görünecek kullanıcı adını belirle. Bu isim değiştirilemez!
              </p>
              
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  setUsernameError("");
                }}
                placeholder="kullanici_adi"
                maxLength={15}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                onKeyDown={(e) => e.key === "Enter" && handleUsernameSubmit()}
              />
              
              {usernameError && (
                <p className="text-red-400 text-sm mt-2">{usernameError}</p>
              )}
              
              <p className="text-slate-500 text-xs mt-2">
                3-15 karakter, sadece harf, rakam ve alt çizgi
              </p>
            </div>
            
            <button
              onClick={handleUsernameSubmit}
              disabled={isCheckingUsername}
              className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white hover:from-orange-400 hover:via-red-400 hover:to-pink-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isCheckingUsername ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                "Kaydet ve Başla"
              )}
            </button>
          </div>
        </div>
      )}

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

        {/* User Info */}
        {existingUser && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-slate-700 mb-4 flex items-center justify-center gap-2">
            <User className="w-4 h-4 text-orange-400" />
            <span className="text-slate-300 text-sm">Kullanıcı adın:</span>
            <span className="text-orange-400 font-bold">{existingUser.username}</span>
          </div>
        )}

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
