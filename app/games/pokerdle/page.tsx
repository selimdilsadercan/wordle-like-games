"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

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

  const toggleCard = (rank: string, suit: string) => {
    const card = `${rank}${suit}`;
    if (selectedCards.includes(card)) {
      setSelectedCards(selectedCards.filter((c) => c !== card));
    } else if (selectedCards.length < 5) {
      setSelectedCards([...selectedCards, card]);
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
        return "bg-green-500";
      case "present":
        return "bg-yellow-500";
      case "absent":
        return "bg-gray-600";
      default:
        return "bg-gray-800";
    }
  };

  const getSuitColor = (suit: string) => {
    return suit === "♥" || suit === "♦" ? "text-red-500" : "text-white";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-rose-800 to-red-900 flex flex-col items-center justify-center p-4">
      <Link
        href="/"
        className="absolute top-4 left-4 text-white hover:text-red-300 transition-colors"
      >
        ← Back to Games
      </Link>

      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold text-white text-center mb-2">
          POKERDLE
        </h1>
        <p className="text-center text-red-200 mb-6">Guess the poker hand</p>

        {message && (
          <div className="text-center mb-4 p-2 bg-white/20 rounded text-white">
            {message}
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-white font-semibold mb-2">
            Selected Cards ({selectedCards.length}/5):
          </h3>
          <div className="flex gap-2 mb-4">
            {selectedCards.map((card, idx) => {
              const suit = card.slice(-1);
              const rank = card.slice(0, -1);
              return (
                <div
                  key={idx}
                  className="w-16 h-20 bg-white rounded border-2 border-gray-300 flex flex-col items-center justify-center"
                >
                  <div className={`text-2xl font-bold ${getSuitColor(suit)}`}>
                    {rank}
                  </div>
                  <div className={`text-3xl ${getSuitColor(suit)}`}>{suit}</div>
                </div>
              );
            })}
            {[...Array(5 - selectedCards.length)].map((_, idx) => (
              <div
                key={idx}
                className="w-16 h-20 bg-gray-700 rounded border-2 border-gray-600 flex items-center justify-center text-gray-500"
              >
                ?
              </div>
            ))}
          </div>
          <button
            onClick={handleGuess}
            disabled={selectedCards.length !== 5 || gameState !== "playing"}
            className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors font-semibold disabled:opacity-50"
          >
            Guess Hand
          </button>
        </div>

        <div className="space-y-2 mb-6">
          {guesses.map((guess, row) => (
            <div key={row} className="flex gap-2">
              {guess.map((cardData, col) => {
                const suit = cardData.card.slice(-1);
                const rank = cardData.card.slice(0, -1);
                return (
                  <div
                    key={col}
                    className={`w-16 h-20 ${getCardColor(
                      cardData.state
                    )} rounded flex flex-col items-center justify-center text-white`}
                  >
                    <div className="text-lg font-bold">{rank}</div>
                    <div className="text-2xl">{suit}</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mb-4">
          <h3 className="text-white font-semibold mb-2">Select Cards:</h3>
          <div className="grid grid-cols-4 gap-2">
            {SUITS.map((suit) => (
              <div key={suit} className="space-y-1">
                <div
                  className={`text-center text-white font-semibold ${getSuitColor(
                    suit
                  )}`}
                >
                  {suit}
                </div>
                {RANKS.map((rank) => {
                  const card = `${rank}${suit}`;
                  const isSelected = selectedCards.includes(card);
                  return (
                    <button
                      key={rank}
                      onClick={() => toggleCard(rank, suit)}
                      disabled={
                        gameState !== "playing" ||
                        (!isSelected && selectedCards.length >= 5)
                      }
                      className={`w-full py-2 rounded ${
                        isSelected
                          ? "bg-red-500 text-white"
                          : "bg-gray-700 text-white hover:bg-gray-600"
                      } disabled:opacity-50 transition-colors`}
                    >
                      {rank}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {gameState !== "playing" && (
          <div className="text-center">
            <button
              onClick={resetGame}
              className="px-6 py-2 bg-white text-red-800 font-bold rounded-lg hover:bg-red-100 transition-colors"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pokerdle;
