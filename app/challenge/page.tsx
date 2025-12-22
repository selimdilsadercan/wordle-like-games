"use client";

import { useState } from "react";
import { Copy, Share2, Check, Users, Link2, Gamepad2 } from "lucide-react";
import AppBar from "@/components/AppBar";
import Header from "@/components/Header";

// Available games for custom challenges
const availableGames = [
  {
    id: "wordle",
    name: "Wordle",
    icon: "🔤",
    description: "Özel bir 5 harfli kelime seç",
    placeholder: "Kelime girin (5 harf)",
    maxLength: 5,
  },
  {
    id: "contexto",
    name: "Contexto",
    icon: "🧠",
    description: "Özel bir kelime seç",
    placeholder: "Hedef kelime girin",
    maxLength: 20,
  },
  {
    id: "nerdle",
    name: "Nerdle",
    icon: "🔢",
    description: "Özel bir matematik denklemi seç",
    placeholder: "Örn: 12+34=46",
    maxLength: 8,
  },
];

export default function ChallengePage() {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [customWord, setCustomWord] = useState("");
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedGameData = availableGames.find((g) => g.id === selectedGame);

  const handleCreateChallenge = () => {
    if (!selectedGame || !customWord.trim()) return;
    
    // Generate a simple encoded link (in production, this would be stored in a database)
    const encoded = btoa(`${selectedGame}:${customWord}`);
    const link = `${window.location.origin}/challenge/${encoded}`;
    setCreatedLink(link);
  };

  const handleCopy = async () => {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!createdLink) return;
    if (navigator.share) {
      await navigator.share({
        title: `Everydle Challenge - ${selectedGameData?.name}`,
        text: `Sana bir ${selectedGameData?.name} meydan okuması gönderiyorum! Çözebilir misin?`,
        url: createdLink,
      });
    } else {
      handleCopy();
    }
  };

  const resetForm = () => {
    setSelectedGame(null);
    setCustomWord("");
    setCreatedLink(null);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Title Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4 shadow-lg shadow-purple-500/30">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Meydan Okuma Oluştur</h2>
          <p className="text-slate-400 text-sm">
            Arkadaşlarına özel bir oyun hazırla ve meydan oku!
          </p>
        </div>

        {!createdLink ? (
          <>
            {/* Game Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                1. Oyun Seç
              </label>
              <div className="grid grid-cols-3 gap-3">
                {availableGames.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => {
                      setSelectedGame(game.id);
                      setCustomWord("");
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedGame === game.id
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-700 bg-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <div className="text-3xl mb-2">{game.icon}</div>
                    <div className="text-sm font-medium text-white">{game.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Word Input */}
            {selectedGame && selectedGameData && (
              <div className="mb-6 animate-fade-in">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  2. {selectedGameData.description}
                </label>
                <input
                  type="text"
                  value={customWord}
                  onChange={(e) => setCustomWord(e.target.value.toUpperCase())}
                  placeholder={selectedGameData.placeholder}
                  maxLength={selectedGameData.maxLength}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-center text-lg font-bold tracking-widest"
                />
                <p className="text-xs text-slate-500 mt-2 text-center">
                  {customWord.length}/{selectedGameData.maxLength} karakter
                </p>
              </div>
            )}

            {/* Create Button */}
            <button
              onClick={handleCreateChallenge}
              disabled={!selectedGame || !customWord.trim()}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                selectedGame && customWord.trim()
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/30"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Gamepad2 className="w-5 h-5" />
                <span>Meydan Okuma Oluştur</span>
              </div>
            </button>
          </>
        ) : (
          /* Success State */
          <div className="animate-fade-in">
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">
                Meydan Okuma Hazır!
              </h3>
              <p className="text-slate-400 text-sm text-center mb-6">
                Linki paylaşarak arkadaşlarını davet et
              </p>

              {/* Link Display */}
              <div className="flex items-center gap-2 bg-slate-700 rounded-lg p-3 mb-4">
                <Link2 className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-300 truncate flex-1">
                  {createdLink}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 text-emerald-400" />
                      <span>Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>Kopyala</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 rounded-xl text-white font-medium transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  <span>Paylaş</span>
                </button>
              </div>
            </div>

            {/* Create Another */}
            <button
              onClick={resetForm}
              className="w-full py-3 text-slate-400 hover:text-white transition-colors"
            >
              Yeni meydan okuma oluştur
            </button>
          </div>
        )}

        {/* Bottom Padding for AppBar */}
        <div className="h-24" />
      </main>

      {/* Bottom Navigation */}
      <AppBar currentPage="challenge" />
    </div>
  );
}
