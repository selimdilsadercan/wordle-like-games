"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const COUNTRIES = [
  { name: "FRANCE", continent: "EUROPE", flag: "🇫🇷" },
  { name: "JAPAN", continent: "ASIA", flag: "🇯🇵" },
  { name: "BRAZIL", continent: "SOUTH AMERICA", flag: "🇧🇷" },
  { name: "EGYPT", continent: "AFRICA", flag: "🇪🇬" },
  { name: "CANADA", continent: "NORTH AMERICA", flag: "🇨🇦" },
  { name: "AUSTRALIA", continent: "OCEANIA", flag: "🇦🇺" },
  { name: "INDIA", continent: "ASIA", flag: "🇮🇳" },
  { name: "GERMANY", continent: "EUROPE", flag: "🇩🇪" },
  { name: "MEXICO", continent: "NORTH AMERICA", flag: "🇲🇽" },
  { name: "SOUTH AFRICA", continent: "AFRICA", flag: "🇿🇦" },
];

interface Guess {
  country: string;
  continent: string;
  distance: number;
  direction: string;
}

const Worldle = () => {
  const [targetCountry, setTargetCountry] = useState<
    (typeof COUNTRIES)[0] | null
  >(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">(
    "playing"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const randomCountry =
      COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    setTargetCountry(randomCountry);
  }, []);

  const calculateDistance = (guess: string): number => {
    if (!targetCountry) return 0;
    // Simplified distance calculation (alphabetical distance)
    const guessIndex = COUNTRIES.findIndex((c) => c.name === guess);
    const targetIndex = COUNTRIES.findIndex(
      (c) => c.name === targetCountry.name
    );
    return Math.abs(guessIndex - targetIndex);
  };

  const getDirection = (guess: string): string => {
    if (!targetCountry) return "";
    const guessIndex = COUNTRIES.findIndex((c) => c.name === guess);
    const targetIndex = COUNTRIES.findIndex(
      (c) => c.name === targetCountry.name
    );

    if (guessIndex === targetIndex) return "🎯 EXACT";
    if (guessIndex < targetIndex) return "➡️ EAST";
    return "⬅️ WEST";
  };

  const handleGuess = () => {
    if (!currentGuess.trim() || !targetCountry) return;

    const guess = currentGuess.toUpperCase().trim();
    const foundCountry = COUNTRIES.find((c) => c.name === guess);

    if (!foundCountry) {
      setMessage("Country not found in list!");
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    if (guesses.some((g) => g.country === guess)) {
      setMessage("You already guessed this country!");
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    const distance = calculateDistance(guess);
    const direction = getDirection(guess);
    const newGuess: Guess = {
      country: guess,
      continent: foundCountry.continent,
      distance,
      direction,
    };

    setGuesses([...guesses, newGuess]);

    if (guess === targetCountry.name) {
      setGameState("won");
      setMessage("Congratulations! You found the country!");
    } else if (guesses.length >= 5) {
      setGameState("lost");
      setMessage(
        `Game Over! The country was ${targetCountry.name} ${targetCountry.flag}`
      );
    }

    setCurrentGuess("");
  };

  const resetGame = () => {
    const randomCountry =
      COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    setTargetCountry(randomCountry);
    setGuesses([]);
    setCurrentGuess("");
    setGameState("playing");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-900 via-orange-800 to-yellow-900 flex flex-col items-center justify-center p-4">
      <Link
        href="/"
        className="absolute top-4 left-4 text-white hover:text-yellow-300 transition-colors"
      >
        ← Back to Games
      </Link>

      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-white text-center mb-2">
          WORLDLE
        </h1>
        <p className="text-center text-yellow-200 mb-6">Guess the country</p>

        {message && (
          <div className="text-center mb-4 p-2 bg-white/20 rounded text-white">
            {message}
          </div>
        )}

        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={currentGuess}
              onChange={(e) => setCurrentGuess(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleGuess()}
              placeholder="Enter country name..."
              disabled={gameState !== "playing"}
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/50 border-2 border-yellow-400 focus:outline-none focus:border-yellow-300"
            />
            <button
              onClick={handleGuess}
              disabled={gameState !== "playing"}
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition-colors font-semibold disabled:opacity-50"
            >
              Guess
            </button>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-yellow-200 text-sm mb-2">Available countries:</p>
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map((country) => (
              <span key={country.name} className="text-white/70 text-xs">
                {country.flag} {country.name}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {guesses.map((guess, idx) => {
            const country = COUNTRIES.find((c) => c.name === guess.country);
            const isCorrect = guess.country === targetCountry?.name;

            return (
              <div
                key={idx}
                className={`p-4 rounded-lg ${
                  isCorrect ? "bg-green-500" : "bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{country?.flag}</span>
                    <div>
                      <div className="text-white font-bold text-lg">
                        {guess.country}
                      </div>
                      <div className="text-white/80 text-sm">
                        {guess.continent}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-semibold">
                      {guess.direction}
                    </div>
                    {!isCorrect && (
                      <div className="text-white/80 text-sm">
                        Distance: {guess.distance}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {guesses.length === 0 && (
          <div className="text-center text-yellow-300 mt-8">
            Start guessing! Use the direction and distance hints to find the
            country.
          </div>
        )}

        {gameState !== "playing" && (
          <div className="text-center mt-6">
            <button
              onClick={resetGame}
              className="px-6 py-2 bg-white text-yellow-800 font-bold rounded-lg hover:bg-yellow-100 transition-colors"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Worldle;
