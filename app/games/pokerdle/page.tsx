"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";

const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];
const SUITS = ["♠", "♥", "♦", "♣"];

interface Card {
  rank: string;
  suit: string;
}

const POKER_HANDS = [
  { name: "ROYAL FLUSH", cards: ["A♠", "K♠", "Q♠", "J♠", "10♠"] },
  { name: "STRAIGHT FLUSH", cards: ["9♠", "8♠", "7♠", "6♠", "5♠"] },
  { name: "FOUR OF A KIND", cards: ["A♠", "A♥", "A♦", "A♣", "K♠"] },
  { name: "FULL HOUSE", cards: ["K♠", "K♥", "K♦", "Q♠", "Q♥"] },
  { name: "FLUSH", cards: ["A♠", "K♠", "Q♠", "J♠", "9♠"] },
  { name: "STRAIGHT", cards: ["10♠", "9♥", "8♦", "7♣", "6♠"] },
  { name: "THREE OF A KIND", cards: ["A♠", "A♥", "A♦", "K♠", "Q♠"] },
  { name: "TWO PAIR", cards: ["A♠", "A♥", "K♦", "K♣", "Q♠"] },
  { name: "ONE PAIR", cards: ["A♠", "A♥", "K♦", "Q♣", "J♠"] },
  { name: "HIGH CARD", cards: ["A♠", "K♥", "Q♦", "J♣", "9♠"] },
];

type CardState = "correct" | "present" | "absent";

interface CardGuess {
  card: string;
  state: CardState;
}

const Pokerdle = () => {
  const [targetHand, setTargetHand] = useState<(typeof POKER_HANDS)[0] | null>(
    null
  );
  const [guesses, setGuesses] = useState<CardGuess[][]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">(
    "playing"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const randomHand =
      POKER_HANDS[Math.floor(Math.random() * POKER_HANDS.length)];
    setTargetHand(randomHand);
  }, []);

  const evaluateGuess = (guess: string[]): CardGuess[] => {
    if (!targetHand) return [];

    const result: CardGuess[] = [];
    const targetCards = [...targetHand.cards];
    const used = new Array(5).fill(false);

    // First pass: mark correct positions
    for (let i = 0; i < 5; i++) {
      if (guess[i] === targetCards[i]) {
        result.push({ card: guess[i], state: "correct" });
        used[i] = true;
      } else {
        result.push({ card: "", state: "absent" });
      }
    }

    // Second pass: mark present cards
    for (let i = 0; i < 5; i++) {
      if (result[i].state === "absent") {
        const card = guess[i];
        const index = targetCards.findIndex(
          (c, idx) => c === card && !used[idx]
        );
        if (index !== -1) {
          result[i] = { card, state: "present" };
          used[index] = true;
        } else {
          result[i] = { card, state: "absent" };
        }
      }
    }

    return result;
  };

  // Kartı rank'a göre sırala (büyükten küçüğe: A > K > Q > J > 10 > ... > 2)
  // Aynı rank'ta ise suit'e göre sırala: maça (♠) > kupa (♥) > karo (♦) > sinek (♣)
  const sortCardsByRank = (cards: string[]): string[] => {
    return [...cards].sort((a, b) => {
      // Rank'ı çıkar (örnek: "A♠" -> "A", "10♠" -> "10")
      const getRank = (card: string) => {
        if (card.startsWith("10")) return "10";
        return card[0];
      };

      // Suit'i çıkar (örnek: "A♠" -> "♠")
      const getSuit = (card: string) => {
        return card.slice(-1);
      };

      const rankA = getRank(a);
      const rankB = getRank(b);

      // RANKS dizisindeki index'e göre karşılaştır (büyük index = daha yüksek değer)
      const indexA = RANKS.indexOf(rankA);
      const indexB = RANKS.indexOf(rankB);

      // Önce rank'a göre sırala (büyükten küçüğe)
      if (indexB !== indexA) {
        return indexB - indexA;
      }

      // Aynı rank ise suit'e göre sırala: ♠ > ♥ > ♦ > ♣
      const suitOrder: Record<string, number> = {
        "♠": 3, // maça
        "♥": 2, // kupa
        "♦": 1, // karo
        "♣": 0, // sinek
      };

      const suitA = getSuit(a);
      const suitB = getSuit(b);

      return suitOrder[suitB] - suitOrder[suitA];
    });
  };

  const toggleCard = (rank: string, suit: string) => {
    const card = `${rank}${suit}`;

    // Check if card is already in current guess
    if (selectedCards.includes(card)) {
      const newCards = selectedCards.filter((c) => c !== card);
      setSelectedCards(sortCardsByRank(newCards));
      setMessage("");
    } else {
      // Only prevent selection if card was used and marked as "absent" (grey)
      // Green (correct) and orange (present) cards can be reused
      const isUsedAsAbsent = guesses.some((guess) =>
        guess.some((g) => g.card === card && g.state === "absent")
      );

      if (isUsedAsAbsent) {
        setMessage("Already placed this card");
        setTimeout(() => setMessage(""), 2000);
        return;
      }

      if (selectedCards.length < 5) {
        const newCards = [...selectedCards, card];
        setSelectedCards(sortCardsByRank(newCards));
        setMessage("");
      }
    }
  };

  const handleGuess = () => {
    if (!targetHand) return;

    if (selectedCards.length !== 5) {
      setMessage("Select exactly 5 cards!");
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    const evaluated = evaluateGuess(selectedCards);
    setGuesses([...guesses, evaluated]);

    if (selectedCards.every((card, idx) => card === targetHand.cards[idx])) {
      setGameState("won");
      setMessage(`Congratulations! You found ${targetHand.name}!`);
    } else if (guesses.length === 5) {
      setGameState("lost");
      setMessage(`Game Over! The hand was ${targetHand.name}`);
    } else {
      setSelectedCards([]);
    }
  };

  const resetGame = () => {
    const randomHand =
      POKER_HANDS[Math.floor(Math.random() * POKER_HANDS.length)];
    setTargetHand(randomHand);
    setGuesses([]);
    setSelectedCards([]);
    setGameState("playing");
    setMessage("");
  };

  const getCardColor = (state: CardState) => {
    switch (state) {
      case "correct":
        return "bg-emerald-600";
      case "present":
        return "bg-orange-500";
      case "absent":
        return "bg-slate-600";
      default:
        return "bg-slate-800";
    }
  };

  const getSuitColor = (suit: string) => {
    return suit === "♥" || suit === "♦" ? "text-red-500" : "text-white";
  };

  // Poker hand ranking values (higher = better)
  const HAND_RANKINGS: Record<string, number> = {
    "ROYAL FLUSH": 10,
    "STRAIGHT FLUSH": 9,
    "FOUR OF A KIND": 8,
    "FULL HOUSE": 7,
    FLUSH: 6,
    STRAIGHT: 5,
    "THREE OF A KIND": 4,
    "TWO PAIR": 3,
    "ONE PAIR": 2,
    "HIGH CARD": 1,
  };

  // Get poker hand type from cards
  const getHandType = (cards: string[]): string => {
    // Parse cards
    const parsedCards = cards.map((card) => {
      const suit = card.slice(-1);
      const rank = card.slice(0, -1);
      const rankValue =
        rank === "A"
          ? 14
          : rank === "K"
          ? 13
          : rank === "Q"
          ? 12
          : rank === "J"
          ? 11
          : parseInt(rank);
      return { rank, rankValue, suit };
    });

    // Sort by rank
    parsedCards.sort((a, b) => a.rankValue - b.rankValue);

    const ranks = parsedCards.map((c) => c.rankValue);
    const suits = parsedCards.map((c) => c.suit);

    // Check for flush
    const isFlush = suits.every((suit) => suit === suits[0]);

    // Check for straight
    const isStraight =
      ranks[4] - ranks[3] === 1 &&
      ranks[3] - ranks[2] === 1 &&
      ranks[2] - ranks[1] === 1 &&
      ranks[1] - ranks[0] === 1;
    const isAceLowStraight =
      ranks[0] === 2 &&
      ranks[1] === 3 &&
      ranks[2] === 4 &&
      ranks[3] === 5 &&
      ranks[4] === 14;

    // Count rank occurrences
    const rankCounts: Record<number, number> = {};
    ranks.forEach((rank) => {
      rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    });
    const counts = Object.values(rankCounts).sort((a, b) => b - a);

    // Determine hand type
    if (isFlush && isStraight && ranks[0] === 10) {
      return "ROYAL FLUSH";
    }
    if (isFlush && (isStraight || isAceLowStraight)) {
      return "STRAIGHT FLUSH";
    }
    if (counts[0] === 4) {
      return "FOUR OF A KIND";
    }
    if (counts[0] === 3 && counts[1] === 2) {
      return "FULL HOUSE";
    }
    if (isFlush) {
      return "FLUSH";
    }
    if (isStraight || isAceLowStraight) {
      return "STRAIGHT";
    }
    if (counts[0] === 3) {
      return "THREE OF A KIND";
    }
    if (counts[0] === 2 && counts[1] === 2) {
      return "TWO PAIR";
    }
    if (counts[0] === 2) {
      return "ONE PAIR";
    }
    return "HIGH CARD";
  };

  // Compare guess hand with target hand
  const getHandComparison = (
    guessCards: string[]
  ): "low" | "high" | "equal" | null => {
    if (!targetHand) return null;

    const guessHandType = getHandType(guessCards);
    const targetHandType = targetHand.name;

    const guessValue = HAND_RANKINGS[guessHandType] || 0;
    const targetValue = HAND_RANKINGS[targetHandType] || 0;

    if (guessValue < targetValue) return "low";
    if (guessValue > targetValue) return "high";
    return "equal";
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-4 px-4">
      <div className="w-full max-w-xl">
        <header className="mb-6">
          {/* Top row: Back button | Title | Reset button */}
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="p-2 hover:bg-slate-800 rounded transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>

            <h1 className="text-2xl font-bold">POKERDLE</h1>

            <button
              onClick={resetGame}
              className="p-2 hover:bg-slate-800 rounded transition-colors cursor-pointer"
              title="Yeniden Başla"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
          </div>

          {/* Game info */}
          {gameState === "playing" && (
            <div className="flex items-center gap-4 text-sm font-semibold">
              <span>
                Tahmin: <span className="text-slate-400">{guesses.length}</span>
              </span>
            </div>
          )}
        </header>

        {/* Success/Lost State */}
        {(gameState === "won" || gameState === "lost") && (
          <div
            className={`mb-10 bg-slate-800 rounded-lg p-6 text-center border-2 ${
              gameState === "lost" ? "border-slate-500" : "border-emerald-600"
            }`}
          >
            <h2
              className={`text-2xl font-bold mb-3 ${
                gameState === "lost" ? "text-slate-300" : "text-emerald-500"
              }`}
            >
              {gameState === "lost" ? "Oyun Bitti" : "Tebrikler!"}
            </h2>

            <p className="text-lg mb-4">
              {gameState === "lost" ? "El" : "Eli buldunuz"}:{" "}
              <span
                className={`font-bold ${
                  gameState === "lost" ? "text-slate-300" : "text-emerald-500"
                }`}
              >
                {targetHand?.name}
              </span>
            </p>

            <div className="mb-3 flex items-center justify-center gap-4 text-sm font-semibold">
              <span className="text-slate-500">
                Tahmin: <span className="text-slate-400">{guesses.length}</span>
              </span>
            </div>

            <button
              onClick={resetGame}
              className="px-6 py-2 rounded-md bg-emerald-600 text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Tekrar Oyna
            </button>
          </div>
        )}

        {/* Error Message */}
        {message && gameState === "playing" && (
          <div className="mb-4 bg-slate-800 border border-slate-700 rounded-md px-4 py-2 text-center">
            <p className="text-sm text-slate-300">{message}</p>
          </div>
        )}

        {/* 5x5 Grid - Guesses and Current Selection */}
        <div className="mb-6">
          <div className="flex gap-4 items-start justify-center">
            {/* Grid */}
            <div className="space-y-2 mb-4 max-w-md">
              {/* Previous guesses */}
              {guesses.map((guess, row) => (
                <div key={row} className="grid grid-cols-5 gap-2">
                  {guess.map((cardData, col) => {
                    const suit = cardData.card.slice(-1);
                    const rank = cardData.card.slice(0, -1);
                    return (
                      <div
                        key={`${row}-${col}`}
                        className={`aspect-[0.75] ${getCardColor(
                          cardData.state
                        )} rounded flex flex-col items-center justify-center text-slate-100 border ${
                          cardData.state === "correct"
                            ? "border-emerald-400"
                            : cardData.state === "present"
                            ? "border-orange-400"
                            : "border-slate-500"
                        }`}
                      >
                        <div
                          className={`text-base font-bold leading-tight ${getSuitColor(
                            suit
                          )}`}
                        >
                          {rank}
                        </div>
                        <div
                          className={`text-lg leading-tight ${getSuitColor(
                            suit
                          )}`}
                        >
                          {suit}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Current guess row */}
              {gameState === "playing" && (
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 5 }).map((_, col) => {
                    const card = selectedCards[col];
                    if (card) {
                      const suit = card.slice(-1);
                      const rank = card.slice(0, -1);
                      return (
                        <div
                          key={`current-${col}`}
                          className="aspect-[0.75] bg-slate-800 rounded border border-slate-600 flex flex-col items-center justify-center"
                        >
                          <div
                            className={`text-base font-bold leading-tight ${getSuitColor(
                              suit
                            )}`}
                          >
                            {rank}
                          </div>
                          <div
                            className={`text-lg leading-tight ${getSuitColor(
                              suit
                            )}`}
                          >
                            {suit}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={`empty-${col}`}
                        className="aspect-[0.75] bg-slate-800 rounded border border-slate-700 flex items-center justify-center text-slate-500"
                      >
                        <span className="text-sm">?</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty rows to fill 5x5 */}
              {Array.from({
                length: Math.max(
                  0,
                  5 - guesses.length - (gameState === "playing" ? 1 : 0)
                ),
              }).map((_, row) => (
                <div
                  key={`empty-row-${row}`}
                  className="grid grid-cols-5 gap-2"
                >
                  {Array.from({ length: 5 }).map((_, col) => (
                    <div
                      key={`empty-${row}-${col}`}
                      className="aspect-[0.75] bg-slate-800 rounded border border-slate-700 flex items-center justify-center text-slate-500"
                    >
                      <span className="text-sm">?</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Feedback messages - outside grid */}
            {guesses.length > 0 && (
              <div className="space-y-[11px]">
                {guesses.map((guess, row) => {
                  const guessCards = guess.map((g) => g.card);
                  const comparison = getHandComparison(guessCards);
                  if (comparison === "low" || comparison === "high") {
                    return (
                      <div
                        key={row}
                        className="bg-slate-800 border border-slate-700 rounded px-3 py-2 min-w-[100px]"
                      >
                        <span className="text-red-500 text-sm font-semibold">
                          {comparison === "low" ? "Çok Düşük" : "Çok Yüksek"}
                        </span>
                      </div>
                    );
                  }
                  if (comparison === "equal") {
                    return (
                      <div
                        key={row}
                        className="bg-slate-800 border border-slate-700 rounded px-3 py-2 min-w-[100px]"
                      >
                        <span className="text-emerald-400 text-sm font-semibold">
                          Aynı
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={row}
                      className="bg-slate-800 border border-slate-700 rounded px-3 py-2 min-w-[100px]"
                    >
                      <span className="text-slate-500 text-sm">—</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit button */}
          {gameState === "playing" && (
            <button
              onClick={handleGuess}
              disabled={selectedCards.length !== 5}
              className="w-full px-6 py-3 bg-emerald-600 text-slate-100 rounded-md hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tahmin Et
            </button>
          )}
        </div>

        {/* Card Selection - All cards in one row */}
        {gameState === "playing" && (
          <div className="mb-4">
            <div className="flex gap-1 flex-wrap justify-center">
              {SUITS.map((suit) =>
                RANKS.map((rank) => {
                  const card = `${rank}${suit}`;
                  const isSelected = selectedCards.includes(card);
                  // Only lock cards that were used and marked as "absent" (grey)
                  // Green (correct) and orange (present) cards can be reused
                  const wasUsedAsAbsent = guesses.some((guess) =>
                    guess.some((g) => g.card === card && g.state === "absent")
                  );
                  return (
                    <button
                      key={card}
                      onClick={() => toggleCard(rank, suit)}
                      disabled={
                        gameState !== "playing" ||
                        (!isSelected && selectedCards.length >= 5) ||
                        wasUsedAsAbsent
                      }
                      className={`w-10 h-12 rounded-md text-xs font-semibold flex flex-col items-center justify-center ${
                        isSelected
                          ? "bg-emerald-600 text-slate-100"
                          : wasUsedAsAbsent
                          ? "bg-slate-700 text-slate-500 opacity-50"
                          : "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700"
                      } disabled:cursor-not-allowed transition-colors`}
                    >
                      <span>{rank}</span>
                      <span className={`text-sm ${getSuitColor(suit)}`}>
                        {suit}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Pokerdle;
