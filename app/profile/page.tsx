"use client";

import { useState, useEffect } from "react";
import {
  Trophy,
  Settings,
  LogOut,
  Gamepad2,
  Swords,
  LogIn,
  Lock,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import AppBar from "@/components/AppBar";
import Header from "@/components/Header";
import LoginModal from "@/components/LoginModal";
import { useAuth } from "@/contexts/AuthContext";

// Cihaz ID'si al
function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("wordleDeviceId") || "";
}

export default function ProfilePage() {
  const gamesPlayed = 12;
  const gamesWon = 8;
  const [deviceId, setDeviceId] = useState<string>("");
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { user, isAuthenticated, loading, signOut } = useAuth();

  // Cihaz ID'sini al
  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  // Convex kullanıcısını sorgula
  const convexUser = useQuery(
    api.users.getUserByDeviceId,
    deviceId ? { deviceId } : "skip"
  );

  // Giriş yapmamış kullanıcı için profil kartı
  const renderGuestProfile = () => (
    <div className="bg-slate-800 rounded-2xl p-6 mb-6 border border-slate-700">
      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-4xl mb-4 shadow-lg relative">
          👤
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
            <Lock className="w-4 h-4 text-slate-500" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Misafir Oyuncu</h2>
        <p className="text-slate-400 text-sm">Giriş yapmadınız</p>
      </div>

      {/* Login CTA */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-xl p-4 mb-4 border border-emerald-500/20">
        <div className="text-center mb-4">
          <p className="text-white font-medium mb-1">
            Hesabınıza giriş yapın
          </p>
          <p className="text-sm text-slate-400">
            İstatistiklerinizi kaydedin ve başarılarınızı takip edin
          </p>
        </div>
        <button
          onClick={() => setShowLoginModal(true)}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20"
        >
          <LogIn className="w-5 h-5" />
          <span>Giriş Yap</span>
        </button>
      </div>

      {/* Features List */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <span className="text-emerald-400">✓</span>
          <span>İstatistiklerinizi bulutta saklayın</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <span className="text-emerald-400">✓</span>
          <span>Başarılarınızı takip edin</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <span className="text-emerald-400">✓</span>
          <span>Cihazlar arası senkronizasyon</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <span className="text-emerald-400">✓</span>
          <span>Liderlik tablolarına katılın</span>
        </div>
      </div>
    </div>
  );

  // Giriş yapmış kullanıcı için profil kartı
  const renderAuthenticatedProfile = () => (
    <div className="bg-slate-800 rounded-2xl p-6 mb-6 border border-slate-700">
      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt="Profile"
            className="w-24 h-24 rounded-full mb-4 shadow-lg shadow-emerald-500/30 border-4 border-emerald-500/30"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-4xl mb-4 shadow-lg shadow-emerald-500/30">
            👤
          </div>
        )}
        <h2 className="text-xl font-bold text-white mb-1">
          {user?.displayName || "Oyuncu"}
        </h2>
        <p className="text-slate-400 text-sm">{user?.email}</p>
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
  );

  // Giriş yapmamış kullanıcı için menü
  const renderGuestMenu = () => (
    <div className="space-y-3">
      <button
        onClick={() => setShowLoginModal(true)}
        className="w-full flex items-center gap-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl p-4 border border-emerald-500/30 hover:border-emerald-500/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <LogIn className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-emerald-400 font-medium">Giriş Yap</p>
          <p className="text-sm text-slate-400">Google ile giriş yap</p>
        </div>
      </button>

      <button className="w-full flex items-center gap-4 bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
          <Settings className="w-5 h-5 text-slate-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-white font-medium">Ayarlar</p>
          <p className="text-sm text-slate-400">Uygulama ayarları</p>
        </div>
      </button>

      {/* Locked Features */}
      <div className="w-full flex items-center gap-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 opacity-60">
        <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center relative">
          <Trophy className="w-5 h-5 text-slate-500" />
          <Lock className="w-3 h-3 text-slate-500 absolute -bottom-0.5 -right-0.5" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-slate-400 font-medium">Başarılar</p>
          <p className="text-sm text-slate-500">Giriş yapmanız gerekiyor</p>
        </div>
      </div>
    </div>
  );

  // Giriş yapmış kullanıcı için menü
  const renderAuthenticatedMenu = () => (
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

      <button
        onClick={signOut}
        className="w-full flex items-center gap-4 bg-slate-800 rounded-xl p-4 border border-red-900/30 hover:border-red-800/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center">
          <LogOut className="w-5 h-5 text-red-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-red-400 font-medium">Çıkış Yap</p>
          <p className="text-sm text-slate-500">Hesaptan çıkış yap</p>
        </div>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
            <p className="text-slate-400">Yükleniyor...</p>
          </div>
        ) : (
          <>
            {/* Profile Card */}
            {isAuthenticated
              ? renderAuthenticatedProfile()
              : renderGuestProfile()}

            {/* Menu Items */}
            {isAuthenticated ? renderAuthenticatedMenu() : renderGuestMenu()}
          </>
        )}

        {/* Bottom Padding for AppBar */}
        <div className="h-24" />
      </main>

      {/* Bottom Navigation */}
      <AppBar currentPage="profile" />

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Everydle'a Giriş Yap"
        message="Oyun istatistiklerinizi ve başarılarınızı takip etmek için giriş yapın."
      />
    </div>
  );
}
