"use client";

import { useState, useEffect } from "react";
import { Crown, Gift, ArrowRight, Lightbulb, Star, Check } from "lucide-react";
import AppBar from "@/components/AppBar";
import Header from "@/components/Header";
import { getUserStars, canClaimDailyReward, claimDailyReward, getDailyStreak } from "@/lib/userStars";

// Floating emoji component
function FloatingEmoji({ emoji, onComplete }: { emoji: string; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="animate-float-up text-8xl">{emoji}</div>
    </div>
  );
}

// Star particle component
function StarParticle({ delay, x }: { delay: number; x: number }) {
  return (
    <div 
      className="absolute text-2xl animate-star-burst"
      style={{ 
        animationDelay: `${delay}ms`,
        left: `${50 + x}%`,
        top: '50%'
      }}
    >
      ⭐
    </div>
  );
}

export default function StorePage() {
  const [promoCode, setPromoCode] = useState("");
  const [stars, setStars] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(1);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [showStarParticles, setShowStarParticles] = useState(false);
  const [animatingStars, setAnimatingStars] = useState(false);
  const [displayStars, setDisplayStars] = useState(0);

  // Load user data on mount
  useEffect(() => {
    const currentStars = getUserStars();
    setStars(currentStars);
    setDisplayStars(currentStars);
    setCanClaim(canClaimDailyReward());
    setCurrentStreak(getDailyStreak());
  }, []);

  // Animate star count
  const animateStarCount = (from: number, to: number) => {
    setAnimatingStars(true);
    const duration = 1000;
    const steps = 20;
    const increment = (to - from) / steps;
    let current = from;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      current += increment;
      setDisplayStars(Math.round(current));
      
      if (step >= steps) {
        clearInterval(interval);
        setDisplayStars(to);
        setAnimatingStars(false);
      }
    }, duration / steps);
  };

  // Handle daily reward claim
  const handleClaimReward = () => {
    if (!canClaim) return;
    
    // Show emoji animation first
    setShowRewardAnimation(true);
    
    // After emoji, show star particles and update count
    setTimeout(() => {
      setShowRewardAnimation(false);
      setShowStarParticles(true);
      
      const reward = claimDailyReward();
      if (reward > 0) {
        const newStars = getUserStars();
        setStars(newStars);
        animateStarCount(stars, newStars);
        setCanClaim(false);
      }
      
      // Hide particles after animation
      setTimeout(() => {
        setShowStarParticles(false);
      }, 1500);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <Header />

      {/* Reward Animation */}
      {showRewardAnimation && (
        <FloatingEmoji emoji="🎁" onComplete={() => {}} />
      )}

      {/* Star Particles */}
      {showStarParticles && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
          {Array.from({ length: 12 }).map((_, i) => (
            <StarParticle key={i} delay={i * 50} x={(i - 6) * 8} />
          ))}
          <div className="text-6xl animate-bounce">+50 ⭐</div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        
        {/* Stars Balance Display */}
        <div className="mb-6 py-4 px-5 bg-slate-800 rounded-2xl border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Yıldız Bakiyem</span>
            <div className="flex items-center gap-2">
              <Star className={`w-6 h-6 text-yellow-500 fill-yellow-500 ${animatingStars ? "animate-pulse" : ""}`} />
              <span className={`text-2xl font-bold text-white transition-all ${animatingStars ? "text-emerald-400 scale-110" : ""}`}>
                {displayStars}
              </span>
            </div>
          </div>
        </div>

        {/* Premium Subscription Card */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-4 border border-slate-700">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-3">Plus Ol</h2>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">•</span>
                  Çevrimdışı oynama
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">•</span>
                  Reklamsız
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">•</span>
                  Aylık 200 ⭐
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Daily Reward Card */}
        <div className="bg-slate-800 rounded-2xl p-5 mb-4 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                canClaim ? "bg-emerald-500/20" : "bg-slate-700"
              }`}>
                <Gift className={`w-5 h-5 ${canClaim ? "text-emerald-400" : "text-slate-400"}`} />
              </div>
              <div>
                <h3 className="text-white font-medium">Günlük Ödülünü Topla</h3>
                <p className="text-slate-400 text-sm">+50 ⭐</p>
              </div>
            </div>
            
            {/* Streak dots */}
            <div className="flex gap-1.5">
              {[1, 2, 3].map((day) => (
                <div
                  key={day}
                  className={`w-3 h-3 rounded-full transition-all ${
                    day <= currentStreak
                      ? "bg-emerald-500"
                      : "bg-slate-600"
                  }`}
                />
              ))}
            </div>
          </div>
          
          <button
            onClick={handleClaimReward}
            disabled={!canClaim || showRewardAnimation || showStarParticles}
            className={`w-full py-2.5 rounded-xl font-medium transition-all ${
              canClaim && !showRewardAnimation && !showStarParticles
                ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            }`}
          >
            {canClaim ? "Ödülü Al" : "Bugün Alındı ✓"}
          </button>
        </div>

        {/* Boosters Section */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Joker Satın Al
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Skip Booster */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center mb-3">
                  <ArrowRight className="w-6 h-6 text-slate-400" />
                </div>
                <h4 className="text-white font-medium mb-1">Atla</h4>
                <p className="text-slate-400 text-sm">500 ⭐</p>
              </div>
            </div>

            {/* Hint Booster */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center mb-3">
                  <Lightbulb className="w-6 h-6 text-slate-400" />
                </div>
                <h4 className="text-white font-medium mb-1">İpucu</h4>
                <p className="text-slate-400 text-sm">100 ⭐</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coin Packages */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Yıldız Satın Al
          </label>
          <div className="grid grid-cols-3 gap-3">
            {/* Package 1 */}
            <button className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
              <div className="flex flex-col items-center gap-1">
                <span className="text-slate-500 text-xs line-through">45.90₺</span>
                <span className="text-xl font-bold text-white">200</span>
                <span className="text-yellow-500">⭐</span>
              </div>
            </button>

            {/* Package 2 - Popular */}
            <button className="relative bg-slate-800 rounded-xl p-4 border-2 border-emerald-500/50 hover:border-emerald-500 transition-colors">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  POPÜLER
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 mt-1">
                <span className="text-slate-500 text-xs line-through">85.90₺</span>
                <span className="text-xl font-bold text-white">600</span>
                <span className="text-yellow-500">⭐</span>
              </div>
            </button>

            {/* Package 3 */}
            <button className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
              <div className="flex flex-col items-center gap-1">
                <span className="text-slate-500 text-xs line-through">160.90₺</span>
                <span className="text-xl font-bold text-white">2000</span>
                <span className="text-yellow-500">⭐</span>
              </div>
            </button>
          </div>
        </div>

        {/* Promo Code Section */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-dashed border-slate-700">
          <label className="block text-sm text-slate-400 mb-3">Promosyon Kodu</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Kodu gir..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium px-4 py-2.5 rounded-xl transition-colors">
              <Check className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bottom Padding for AppBar */}
        <div className="h-24" />
      </main>

      {/* Bottom Navigation */}
      <AppBar currentPage="store" />

      {/* Custom animations */}
      <style jsx>{`
        @keyframes float-up {
          0% {
            opacity: 0;
            transform: scale(0.5) translateY(50px);
          }
          30% {
            opacity: 1;
            transform: scale(1.2) translateY(0);
          }
          70% {
            opacity: 1;
            transform: scale(1) translateY(-20px);
          }
          100% {
            opacity: 0;
            transform: scale(0.8) translateY(-100px);
          }
        }
        
        @keyframes star-burst {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0);
          }
          30% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.5);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -150%) scale(0.5);
          }
        }
        
        .animate-float-up {
          animation: float-up 1.5s ease-out forwards;
        }
        
        .animate-star-burst {
          animation: star-burst 1.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
