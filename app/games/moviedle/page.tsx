"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MoreVertical,
  HelpCircle,
  Flag,
  RotateCcw,
  Calendar,
  Film,
} from "lucide-react";

// Genre ID -> İsim eşleştirmesi
const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

interface Movie {
  id: number;
  title: string;
  original_title: string;
  year: number;
  release_date: string;
  vote_average: number;
  poster_path: string | null;
  overview: string;
  genre_ids: number[];
}

interface MoviesData {
  movies: Movie[];
  total_count: number;
}

interface Guess {
  movie: Movie;
  yearComparison: "lower" | "higher" | "correct";
}

const Moviedle = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetMovie, setTargetMovie] = useState<Movie | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">(
    "playing"
  );
  const [showMenu, setShowMenu] = useState(false);

  // Film verilerini yükle
  useEffect(() => {
    const loadMovies = async () => {
      try {
        const response = await fetch("/movies.json");
        const data: MoviesData = await response.json();
        setMovies(data.movies);

        // Rastgele bir film seç
        const randomIndex = Math.floor(Math.random() * data.movies.length);
        setTargetMovie(data.movies[randomIndex]);
      } catch (error) {
        console.error("Film verileri yüklenemedi:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMovies();
  }, []);

  // Arama filtreleme
  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim() || movies.length === 0) return [];
    const query = searchQuery.toLowerCase();
    return movies
      .filter(
        (movie) =>
          (movie.title.toLowerCase().includes(query) ||
            movie.original_title.toLowerCase().includes(query)) &&
          !guesses.some((g) => g.movie.id === movie.id)
      )
      .slice(0, 8);
  }, [searchQuery, guesses, movies]);

  const handleGuess = (movie: Movie) => {
    if (!targetMovie || gameState !== "playing") return;

    // Yıl karşılaştırması
    let yearComparison: "lower" | "higher" | "correct" = "correct";
    if (movie.year < targetMovie.year) {
      yearComparison = "lower";
    } else if (movie.year > targetMovie.year) {
      yearComparison = "higher";
    }

    const newGuess: Guess = {
      movie,
      yearComparison,
    };

    setGuesses([...guesses, newGuess]);

    if (movie.id === targetMovie.id) {
      setGameState("won");
    } else if (guesses.length >= 5) {
      setGameState("lost");
    }

    setSearchQuery("");
    setShowSuggestions(false);
  };

  const resetGame = () => {
    if (movies.length === 0) return;
    const randomIndex = Math.floor(Math.random() * movies.length);
    setTargetMovie(movies[randomIndex]);
    setGuesses([]);
    setSearchQuery("");
    setGameState("playing");
  };

  const getYearRange = () => {
    if (guesses.length === 0 || !targetMovie) return { min: "?", max: "?" };

    let min = 1900;
    let max = 2030;

    guesses.forEach((guess) => {
      if (guess.yearComparison === "lower" && guess.movie.year > min) {
        min = guess.movie.year;
      } else if (guess.yearComparison === "higher" && guess.movie.year < max) {
        max = guess.movie.year;
      } else if (guess.yearComparison === "correct") {
        min = guess.movie.year;
        max = guess.movie.year;
      }
    });

    return {
      min: min === 1900 ? "?" : min.toString(),
      max: max === 2030 ? "?" : max.toString(),
    };
  };

  // Yönetmen bilgisi movies.json'da yok, o yüzden şimdilik kaldırıyoruz
  // Aktör bilgisi de yok, o da şimdilik kaldırıldı

  const yearRange = getYearRange();

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-4 px-4">
      <div className="w-full max-w-md">
        <header className="mb-6">
          {/* Top row: Back button | Title | Menu */}
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="p-2 hover:bg-slate-800 rounded transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>

            <h1 className="text-2xl font-bold">MOVIEDLE</h1>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  className="p-2 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <MoreVertical className="w-6 h-6" />
                </button>

                {/* Dropdown Menu */}
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
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3"
                        onClick={() => {
                          setShowMenu(false);
                        }}
                      >
                        <HelpCircle className="w-5 h-5" />
                        <span>Nasıl Oynanır</span>
                      </button>
                      <button
                        className={`w-full px-4 py-3 text-left transition-all flex items-center gap-3 ${
                          gameState !== "playing"
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-slate-700 hover:mx-2 hover:rounded-md cursor-pointer"
                        }`}
                        onClick={() => {
                          if (gameState !== "playing" || !targetMovie) return;
                          // Pes et - doğru filmi göster
                          const correctGuess: Guess = {
                            movie: targetMovie,
                            yearComparison: "correct",
                          };
                          setGuesses([...guesses, correctGuess]);
                          setGameState("lost");
                          setShowMenu(false);
                        }}
                      >
                        <Flag className="w-5 h-5" />
                        <span>Pes Et</span>
                      </button>
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3 border-t border-slate-700 mt-1"
                        onClick={() => {
                          resetGame();
                          setShowMenu(false);
                        }}
                      >
                        <RotateCcw className="w-5 h-5" />
                        <span>Yeni Oyun</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bottom row: Game info */}
          {gameState === "playing" && (
            <div className="flex items-center gap-4 text-sm font-semibold">
              <span>
                Tahmin: <span className="text-slate-400">{guesses.length}</span>
              </span>
              <span>
                Kalan:{" "}
                <span className="text-emerald-400">{6 - guesses.length}</span>
              </span>
            </div>
          )}
        </header>

        {/* Success/Failure State */}
        {gameState !== "playing" && targetMovie && (
          <div
            className={`mb-10 bg-slate-800 rounded-lg p-6 text-center border-2 ${
              gameState === "won" ? "border-emerald-600" : "border-red-500"
            }`}
          >
            <h2
              className={`text-2xl font-bold mb-3 ${
                gameState === "won" ? "text-emerald-500" : "text-red-400"
              }`}
            >
              {gameState === "won"
                ? "Tebrikler!"
                : "Bir dahaki sefere artık..."}
            </h2>

            {/* Film Bilgileri */}
            <div className="mb-4">
              {targetMovie.poster_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w200${targetMovie.poster_path}`}
                  alt={targetMovie.title}
                  className="w-24 h-36 object-cover rounded-lg mx-auto mb-3"
                />
              )}
              <p className="text-lg">
                {gameState === "won" ? "Filmi buldunuz" : "Film"}:{" "}
                <span
                  className={`font-bold ${
                    gameState === "won" ? "text-emerald-500" : "text-red-400"
                  }`}
                >
                  {targetMovie.title}
                </span>
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {targetMovie.year} •{" "}
                {targetMovie.genre_ids
                  .slice(0, 3)
                  .map((id) => GENRE_MAP[id] || "Unknown")
                  .join(", ")}
              </p>
            </div>

            {/* İstatistikler */}
            <div className="mb-4 flex items-center justify-center gap-4 text-sm font-semibold">
              <span className="text-slate-500">
                Tahmin: <span className="text-slate-400">{guesses.length}</span>
              </span>
            </div>

            <button
              onClick={resetGame}
              className="px-6 py-2 rounded-md bg-emerald-600 text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Yeni Oyun
            </button>
          </div>
        )}

        {/* Search Input */}
        {gameState === "playing" && (
          <div className="mb-6 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search for a movie..."
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-4 py-4 text-base outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 placeholder:text-slate-500 transition-all"
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && filteredMovies.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-2xl max-h-80 overflow-y-auto">
                {filteredMovies.map((movie) => (
                  <button
                    key={movie.id}
                    onClick={() => handleGuess(movie)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-3 border-b border-slate-700 last:border-b-0"
                  >
                    {movie.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                        alt={movie.title}
                        className="w-10 h-14 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-14 bg-slate-700 rounded flex items-center justify-center">
                        <Film className="w-5 h-5 text-slate-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">
                        {movie.title}
                      </div>
                      <div className="text-slate-400 text-sm">
                        {movie.year} •{" "}
                        {movie.genre_ids
                          .slice(0, 2)
                          .map((id) => GENRE_MAP[id] || "Unknown")
                          .join(", ")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Guesses List */}
        {guesses.length > 0 && (
          <div className="mb-6 bg-slate-800 rounded-lg border border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-slate-400 text-sm">Tahminler:</span>
            </div>
            <ol className="space-y-1">
              {guesses.map((guess, idx) => (
                <li
                  key={idx}
                  className={`flex items-center gap-2 ${
                    guess.movie.id === targetMovie?.id
                      ? "text-emerald-400"
                      : "text-white"
                  }`}
                >
                  <span className="text-slate-500">{idx + 1}.</span>
                  <span
                    className={`${
                      guess.movie.id === targetMovie?.id
                        ? "text-emerald-400 underline decoration-emerald-400"
                        : "underline decoration-red-500"
                    }`}
                  >
                    {guess.movie.title}
                  </span>
                  {guess.movie.id === targetMovie?.id && (
                    <span className="text-emerald-400">✓</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Hints Section */}
        {guesses.length > 0 && targetMovie && (
          <div className="space-y-3">
            {/* Genre Hints */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <span className="text-slate-300 font-medium">Genres:</span>
                {targetMovie.genre_ids.map((genreId, idx) => {
                  const genreName = GENRE_MAP[genreId] || "Unknown";
                  const isRevealed = guesses.some((g) =>
                    g.movie.genre_ids.includes(genreId)
                  );
                  return (
                    <span
                      key={idx}
                      className={`px-3 py-1 rounded-md text-xs font-semibold uppercase ${
                        isRevealed
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-600 text-slate-300"
                      }`}
                    >
                      {isRevealed ? genreName : "?"}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Year Hint */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <div className="flex items-center justify-center gap-4">
                <span className="text-xl font-bold text-white">
                  {yearRange.min}
                </span>
                <span className="text-slate-400">&lt;</span>
                <div className="p-2 bg-emerald-700 rounded-lg">
                  <Calendar className="w-6 h-6" />
                </div>
                <span className="text-slate-400">&lt;</span>
                <span className="text-xl font-bold text-white">
                  {yearRange.max}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Initial State */}
        {guesses.length === 0 && gameState === "playing" && (
          <div className="text-center text-slate-400 mt-8 bg-slate-800 rounded-lg border border-slate-700 p-8">
            <Film className="w-12 h-12 mx-auto mb-4 text-slate-500" />
            <p className="text-lg">Bir film arayarak başla!</p>
            <p className="text-sm mt-2 text-slate-500">
              Her tahmin sonrası tür ve yıl ipuçları alacaksın.
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export default Moviedle;
