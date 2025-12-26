"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users, Swords, Wifi, X, User, Zap, Trophy, Lock, ChevronUp, Star } from "lucide-react";
import AppBar from "@/components/AppBar";
import Header from "@/components/Header";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  getUserTrophies,
  getCurrentArena,
  getNextArena,
  getArenaProgress,
  isFeatureUnlocked,
  getNextArenaFeatures,
  getAllArenas,
  type Arena,
} from "@/lib/trophySystem";
import { getUserStars } from "@/lib/userStars";

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
  
  // Trophy system state
  const [trophies, setTrophies] = useState(0);
  const [stars, setStars] = useState(0);
  const [currentArena, setCurrentArena] = useState<Arena | null>(null);
  const [nextArena, setNextArena] = useState<Arena | null>(null);
  const [arenaProgress, setArenaProgress] = useState(0);
  const [showTrophyRoad, setShowTrophyRoad] = useState(false);
  
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

  // Cihaz ID'sini ve kupa bilgisini al
  useEffect(() => {
    setDeviceId(getDeviceId());
    
    // Trophy system
    const userTrophies = getUserTrophies();
    setTrophies(userTrophies);
    setCurrentArena(getCurrentArena(userTrophies));
    setNextArena(getNextArena(userTrophies));
    setArenaProgress(getArenaProgress(userTrophies));
    setStars(getUserStars());
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
    if (!deviceId) return;
    
    if (existingUser === undefined) return;
    
    if (existingUser === null) {
      setShowUsernameModal(true);
      return;
    }
    
    startSearchWithUsername(existingUser.username);
  };
  
  const startSearchWithUsername = async (username: string) => {
    setIsSearching(true);
    try {
      const result = await joinQueue({ username });
      setOdaId(result.odaId);
      setMyUsername(result.myUsername || username);
      
      if (result.status === "matched" && result.matchId) {
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

  // Joker ve diğer özelliklerin açık olup olmadığını kontrol et
  const hasJoker = isFeatureUnlocked("joker", trophies);
  const hasHint = isFeatureUnlocked("hint", trophies);
  const hasShake = isFeatureUnlocked("shake", trophies);

  // VS Screen
  if (showVsScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-transparent to-red-500/20 blur-3xl" />
            
            <div className="relative grid grid-cols-3 items-center gap-4 py-8">
              <div className="animate-slide-in-left">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30">
                  <User className="w-10 h-10 text-white" />
                </div>
                <p className="text-emerald-400 font-bold text-lg truncate px-2">{myUsername}</p>
                <p className="text-emerald-400/60 text-xs">SEN</p>
              </div>
              
              <div className="animate-scale-in">
                <div className="relative">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -inset-2 rounded-full border-2 border-red-500/30 animate-ping" />
                </div>
                <p className="text-white font-black text-2xl mt-2">VS</p>
              </div>
              
              <div className="animate-slide-in-right">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center mb-3 shadow-lg shadow-red-500/30">
                  <User className="w-10 h-10 text-white" />
                </div>
                <p className="text-red-400 font-bold text-lg truncate px-2">{opponentUsername}</p>
                <p className="text-red-400/60 text-xs">RAKİP</p>
              </div>
            </div>
            
            <div className="mt-8">
              <p className="text-slate-400 text-sm mb-2">Maç başlıyor</p>
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-500/50">
                <span className="text-white font-black text-4xl">{vsCountdown}</span>
              </div>
            </div>
          </div>
        </div>
        
        <style jsx>{`
          @keyframes slide-in-left { from { opacity: 0; transform: translateX(-50px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes slide-in-right { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes scale-in { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
          .animate-slide-in-left { animation: slide-in-left 0.5s ease-out forwards; }
          .animate-slide-in-right { animation: slide-in-right 0.5s ease-out forwards; }
          .animate-scale-in { animation: scale-in 0.5s ease-out 0.3s forwards; opacity: 0; }
        `}</style>
      </div>
    );
  }

  // Trophy Road Modal
  if (showTrophyRoad) {
    const allArenas = getAllArenas();
    return (
      <div className="min-h-screen bg-slate-900">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 p-4">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Kupa Yolu
            </h1>
            <button
              onClick={() => setShowTrophyRoad(false)}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-xl text-white font-bold transition-colors"
            >
              TAMAM
            </button>
          </div>
        </div>
        
        {/* Trophy Road */}
        <div className="max-w-lg mx-auto p-4 pb-8">
          {/* Current Trophy Display */}
          <div className="flex items-center gap-2 mb-6 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <span className="text-yellow-400 font-bold text-xl">{trophies}</span>
          </div>
          
          {/* Arena List - Reverse order (highest first) */}
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-6 top-0 bottom-0 w-1 bg-slate-700" />
            
            <div className="space-y-4">
              {[...allArenas].reverse().map((arena, index) => {
                const isCurrentArena = currentArena?.id === arena.id;
                const isUnlocked = trophies >= arena.minTrophies;
                const isPast = trophies > arena.maxTrophies;
                
                return (
                  <div key={arena.id} className="relative flex items-start gap-4 pl-2">
                    {/* Node on progress line */}
                    <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-xl ${
                      isCurrentArena 
                        ? "bg-yellow-500 ring-4 ring-yellow-500/30" 
                        : isPast
                        ? "bg-emerald-500"
                        : isUnlocked
                        ? "bg-slate-500"
                        : "bg-slate-600"
                    }`}>
                      {isCurrentArena ? "📍" : arena.icon}
                    </div>
                    
                    {/* Arena Card */}
                    <div className={`flex-1 rounded-xl p-4 border transition-all ${
                      isCurrentArena
                        ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50"
                        : isPast
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : isUnlocked
                        ? "bg-slate-800/50 border-slate-600"
                        : "bg-slate-800/50 border-slate-700 opacity-60"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`font-bold ${isCurrentArena ? "text-yellow-400" : "text-white"}`}>
                          {arena.name}
                        </h3>
                        <span className={`text-sm font-bold ${isCurrentArena ? "text-yellow-400" : "text-slate-400"}`}>
                          {arena.minTrophies}+
                        </span>
                      </div>
                      
                      {/* Unlocks */}
                      {arena.unlocks.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-400">Açılır:</span>
                          {arena.unlocks.map((unlockId) => {
                            const icons: Record<string, string> = {
                              joker: "🃏", hint: "💡", shake: "📳",
                              double_points: "✨", freeze: "❄️", reveal_word: "👁️", all_modes: "🌟"
                            };
                            return (
                              <span key={unlockId} className="text-lg">{icons[unlockId]}</span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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
              <button onClick={() => setShowUsernameModal(false)} className="p-1 hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-slate-400 text-sm mb-4">Online maçlarda görünecek kullanıcı adını belirle.</p>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => { setUsernameInput(e.target.value); setUsernameError(""); }}
                placeholder="kullanici_adi"
                maxLength={15}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                onKeyDown={(e) => e.key === "Enter" && handleUsernameSubmit()}
              />
              {usernameError && <p className="text-red-400 text-sm mt-2">{usernameError}</p>}
            </div>
            
            <button
              onClick={handleUsernameSubmit}
              disabled={isCheckingUsername}
              className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white disabled:opacity-50 transition-all"
            >
              {isCheckingUsername ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Kaydet ve Başla"}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <Header />

      {/* Arena Display - Center */}
      <div className="relative px-4 py-8">
        <div className="max-w-lg mx-auto">
          
          {/* Arena Visual Card */}
          <div 
            onClick={() => setShowTrophyRoad(true)}
            className="relative cursor-pointer group"
          >
            
            {/* Main Card */}
            <div className="relative bg-gradient-to-b from-slate-800/90 to-slate-900/90 rounded-3xl border border-slate-700 overflow-hidden">
              {/* Top Decorative Border */}
              <div className={`h-1 bg-gradient-to-r ${currentArena?.color || "from-slate-500 to-slate-600"}`} />
              
              {/* Arena Content */}
              <div className="p-6 text-center">
                {/* Arena Icon - Large */}
                <div className="text-6xl mb-3 filter drop-shadow-lg">
                  {currentArena?.icon}
                </div>
                
                {/* Arena Name */}
                <h2 className="text-2xl font-black text-white mb-4">
                  {currentArena?.name}
                </h2>
                
                {/* Trophy Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">{currentArena?.minTrophies}</span>
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 font-bold">{trophies}</span>
                    </div>
                    <span className="text-slate-400">{nextArena?.minTrophies || "MAX"}</span>
                  </div>
                  <div className="h-4 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
                    <div 
                      className={`h-full bg-gradient-to-r ${currentArena?.color || "from-slate-500 to-slate-600"} rounded-full transition-all duration-500`}
                      style={{ width: `${arenaProgress}%` }}
                    />
                  </div>
                </div>
                
                {/* Next Arena Preview */}
                {nextArena && (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <span className="text-slate-400">Sonraki:</span>
                    <span className="text-lg">{nextArena.icon}</span>
                    <span className="text-white font-semibold">{nextArena.name}</span>
                  </div>
                )}
                
                {/* View Trophy Road Button */}
                <div className="flex items-center justify-center gap-1 mt-4 text-blue-400 text-sm font-medium">
                  <ChevronUp className="w-4 h-4" />
                  <span>Kupa Yolunu Gör</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Battle Button */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4">
        <div className="max-w-lg mx-auto">
          {/* Online Status */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">
              {queueCount !== undefined ? `${queueCount} oyuncu bekliyor` : "Çevrimiçi"}
            </span>
          </div>
          
          {/* Battle Button */}
          {!isSearching ? (
            <button
              onClick={handleStartSearch}
              className="w-full relative group"
            >
              {/* Shadow */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-700 rounded-2xl translate-y-1.5" />
              
              {/* Button */}
              <div className="relative bg-gradient-to-r from-green-400 via-green-500 to-green-400 rounded-2xl py-5 px-8 transform group-hover:-translate-y-0.5 group-active:translate-y-1 transition-transform">
                <div className="flex items-center justify-center gap-3">
                  <Swords className="w-8 h-8 text-white drop-shadow-lg" />
                  <span className="text-2xl font-black text-white drop-shadow-lg tracking-wide">SAVAŞ</span>
                </div>
                <p className="text-green-100 text-xs mt-1 font-medium">1v1 Wordle Düellosu</p>
              </div>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-green-400 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Wifi className="w-5 h-5 text-green-300" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">Rakip Aranıyor{dots}</p>
                    <p className="text-sm text-slate-400 mt-1">Eşleşme bekleniyor</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCancelSearch}
                className="w-full py-3 rounded-xl font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              >
                İptal Et
              </button>
            </div>
          )}
          
          {/* Match Rewards Info */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-1">
              <span className="text-lg">🏆</span>
              <span className="text-emerald-400 font-bold">+30</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg">💔</span>
              <span className="text-red-400 font-bold">-15</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <AppBar currentPage="challenge" />
    </div>
  );
}
