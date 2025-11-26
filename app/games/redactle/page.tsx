"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MoreVertical,
  RotateCcw,
  X,
  HelpCircle,
} from "lucide-react";

// Turkish common words (stop words)
const TURKISH_COMMON_WORDS = [
  "bir",
  "bu",
  "ve",
  "ile",
  "için",
  "olan",
  "olan",
  "da",
  "de",
  "ki",
  "mi",
  "mı",
  "mu",
  "mü",
  "veya",
  "ya",
  "ile",
  "gibi",
  "kadar",
  "daha",
  "en",
  "çok",
  "az",
  "var",
  "yok",
  "ise",
  "ise",
  "şu",
  "o",
  "bu",
  "şey",
  "şeyler",
  "şeyi",
  "şeyin",
  "şeyden",
  "şeye",
  "şeyle",
  "şeyde",
  "ile",
  "için",
  "gibi",
  "kadar",
  "daha",
  "en",
  "çok",
  "az",
  "var",
  "yok",
  "ise",
  "ise",
  "olan",
  "olan",
  "olan",
  "olan",
  "olan",
  "olan",
  "olan",
  "olan",
  "olan",
  "olan",
  "olan",
];

const commonWordsDict: Record<string, boolean> = {};
TURKISH_COMMON_WORDS.forEach((w) => {
  commonWordsDict[w.toLowerCase()] = true;
});

// Regex for Turkish characters
const TURKISH_WORD_REGEX =
  /([\u00BF-\u1FFF\u2C00-\uD7FF\w\u0130\u0131\u011E\u011F\u015E\u015F\u00C7\u00E7\u00D6\u00F6\u00DC\u00FC]+)([^\u00BF-\u1FFF\u2C00-\uD7FF\w\u0130\u0131\u011E\u011F\u015E\u015F\u00C7\u00E7\u00D6\u00F6\u00DC\u00FC]*)/gi;

interface Token {
  value: string;
  wordNormal: string;
  id: string;
  redacted: boolean;
  highlight: boolean;
}

interface Section {
  headline: boolean;
  tokens: Token[];
}

const Redactle = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [gameState, setGameState] = useState<{
    urlTitle: string;
    guesses: Record<string, number>;
    revealed?: Record<string, boolean>;
    solved: boolean;
  } | null>(null);
  const [currentGuess, setCurrentGuess] = useState("");
  const [loading, setLoading] = useState(true);
  const [wordCount, setWordCount] = useState<Record<string, number>>({});
  const [tokenLookup, setTokenLookup] = useState<Record<string, Token[]>>({});
  const [selectedWord, setSelectedWord] = useState("");
  const [message, setMessage] = useState("");
  // Debug toggle: when true, reveal all words (useful for debugging)
  const [debugRevealAll, setDebugRevealAll] = useState(false);
  // Undo stack for guesses snapshots (for simple "Geri Al" behavior)
  const [undoStack, setUndoStack] = useState<
    Array<{
      guesses: Record<string, number>;
      revealed?: Record<string, boolean>;
    }>
  >([]);
  // Keys revealed by the last guess (used for blue highlighting)
  const [lastRevealed, setLastRevealed] = useState<Record<string, boolean>>({});
  // ref to the scrollable article container so we can scroll tokens into view
  const articleRef = useRef<HTMLDivElement | null>(null);
  // remember last scrolled index per word so repeated clicks go to next occurrence
  const [lastScrollIndex, setLastScrollIndex] = useState<
    Record<string, number>
  >({});
  const [showMenu, setShowMenu] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  // Track clicked token to show letter count
  const [clickedTokenId, setClickedTokenId] = useState<string | null>(null);

  // Normalize Turkish text (lowercase, remove accents)
  const normalize = (str: string): string => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/ı/g, "i")
      .replace(/İ/g, "i")
      .trim()
      .split(" ")[0];
  };

  // Heuristic Turkish suffix list (normalized form). We'll iteratively strip
  // long->short to find the lemma-like stem. This is not a full morphological
  // analyzer but covers common inflectional/derivational endings so that when
  // the user enters any inflected form, we can reveal related variants.
  const TURKISH_SUFFIXES = [
    "lerin",
    "larin",
    "leri",
    "lari",
    "ler",
    "lar",
    "im",
    "in",
    "un",
    "si",
    "su",
    "de",
    "da",
    "den",
    "dan",
    "ten",
    "tan",
    "e",
    "a",
    "ye",
    "ya",
    "yi",
    "i",
    "u",
    "dir",
    "dur",
    "cek",
    "acak",
    "ci",
    "lik",
    "li",
    "m",
    "n",
  ];

  const stripTurkishSuffixes = (w0: string): string => {
    let w = w0;
    // sort suffixes by length desc to remove longest first
    const suffixes = [...TURKISH_SUFFIXES].sort((a, b) => b.length - a.length);
    for (let iter = 0; iter < 3; iter++) {
      let removed = false;
      for (const s of suffixes) {
        if (w.length - s.length >= 3 && w.endsWith(s)) {
          w = w.slice(0, -s.length);
          removed = true;
          break;
        }
      }
      if (!removed) break;
    }
    return w;
  };

  const getMatchingVariants = (guessNorm: string): string[] => {
    if (!tokenLookup) return [];
    const keys = Object.keys(tokenLookup);
    const guessStem = stripTurkishSuffixes(guessNorm);
    const matches = new Set<string>();

    // First, check exact match
    if (keys.includes(guessNorm)) {
      matches.add(guessNorm);
    }

    // Then check for Turkish inflection variants (same stem)
    for (const k of keys) {
      if (!k) continue;
      if (k === guessNorm) continue; // Already added

      const kStem = stripTurkishSuffixes(k);
      // Only match if stems are the same and both are at least 3 characters
      if (kStem === guessStem && kStem.length >= 3) {
        matches.add(k);
      }
    }

    return Array.from(matches);
  };

  // Base64 encode (used for token IDs)
  const base64encode = (str: string): string => {
    const encode = encodeURIComponent(str).replace(
      /%([a-f0-9]{2})/gi,
      (m, $1) => String.fromCharCode(parseInt($1, 16))
    );
    return btoa(encode);
  };

  // Load article from markdown file
  const loadArticle = useCallback(async () => {
    if (!gameState) return;

    setLoading(true);
    try {
      // Load the markdown file
      const response = await fetch("/aritcle.md");
      if (!response.ok) {
        throw new Error("Makale dosyası yüklenemedi");
      }

      const markdownText = await response.text();
      const allLines = markdownText.split("\n");

      // First line is the title
      const title = allLines[0].trim();
      const content = allLines.slice(1).join("\n").trim();

      const newSections: Section[] = [];
      const newWordCount: Record<string, number> = {};
      const newTokenLookup: Record<string, Token[]> = {};

      // Add title as headline
      const titleMatches = [...title.matchAll(TURKISH_WORD_REGEX)];
      const titleTokens = getTokens(
        titleMatches,
        newWordCount,
        newTokenLookup,
        true
      );
      newSections.push({ headline: true, tokens: titleTokens });

      // Process content - handle markdown formatting
      const contentLines = content.split("\n");
      let currentParagraph: string[] = [];

      for (let i = 0; i < contentLines.length; i++) {
        const line = contentLines[i].trim();

        // Empty line - end current paragraph
        if (!line) {
          if (currentParagraph.length > 0) {
            const paraText = currentParagraph.join(" ");
            const textMatches = [...paraText.matchAll(TURKISH_WORD_REGEX)];
            const textTokens = getTokens(
              textMatches,
              newWordCount,
              newTokenLookup,
              false
            );
            if (textTokens.length > 0) {
              newSections.push({ headline: false, tokens: textTokens });
            }
            currentParagraph = [];
          }
          continue;
        }

        // Markdown headers (##, ###, etc.)
        if (line.startsWith("##")) {
          // End current paragraph if exists
          if (currentParagraph.length > 0) {
            const paraText = currentParagraph.join(" ");
            const textMatches = [...paraText.matchAll(TURKISH_WORD_REGEX)];
            const textTokens = getTokens(
              textMatches,
              newWordCount,
              newTokenLookup,
              false
            );
            if (textTokens.length > 0) {
              newSections.push({ headline: false, tokens: textTokens });
            }
            currentParagraph = [];
          }

          // Extract header text (remove # and spaces)
          const headerText = line.replace(/^#+\s*/, "");
          const headerMatches = [...headerText.matchAll(TURKISH_WORD_REGEX)];
          const headerTokens = getTokens(
            headerMatches,
            newWordCount,
            newTokenLookup,
            true
          );
          if (headerTokens.length > 0) {
            newSections.push({ headline: true, tokens: headerTokens });
          }
          continue;
        }

        // List items (starting with - or *)
        if (line.startsWith("- ") || line.startsWith("* ")) {
          // End current paragraph if exists
          if (currentParagraph.length > 0) {
            const paraText = currentParagraph.join(" ");
            const textMatches = [...paraText.matchAll(TURKISH_WORD_REGEX)];
            const textTokens = getTokens(
              textMatches,
              newWordCount,
              newTokenLookup,
              false
            );
            if (textTokens.length > 0) {
              newSections.push({ headline: false, tokens: textTokens });
            }
            currentParagraph = [];
          }

          // Process list item (remove - or *)
          const listText = line.replace(/^[-*]\s+/, "");
          const listMatches = [...listText.matchAll(TURKISH_WORD_REGEX)];
          const listTokens = getTokens(
            listMatches,
            newWordCount,
            newTokenLookup,
            false
          );
          if (listTokens.length > 0) {
            // Add bullet point as a token
            listTokens.unshift({
              value: "• ",
              wordNormal: "",
              id: "",
              redacted: false,
              highlight: false,
            });
            newSections.push({ headline: false, tokens: listTokens });
          }
          continue;
        }

        // Regular text line - add to current paragraph
        currentParagraph.push(line);
      }

      // Process remaining paragraph
      if (currentParagraph.length > 0) {
        const paraText = currentParagraph.join(" ");
        const textMatches = [...paraText.matchAll(TURKISH_WORD_REGEX)];
        const textTokens = getTokens(
          textMatches,
          newWordCount,
          newTokenLookup,
          false
        );
        if (textTokens.length > 0) {
          newSections.push({ headline: false, tokens: textTokens });
        }
      }

      setSections(newSections);
      setWordCount(newWordCount);
      setTokenLookup(newTokenLookup);
      renderTokens(newSections, newWordCount, newTokenLookup);
    } catch (error) {
      console.error("Error loading article:", error);
      setMessage(
        error instanceof Error
          ? `Hata: ${error.message}`
          : "Makale yüklenirken hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }, [gameState]);

  // Get tokens from matches
  const getTokens = (
    matches: RegExpMatchArray[],
    wordCount: Record<string, number>,
    tokenLookup: Record<string, Token[]>,
    isTitle: boolean
  ): Token[] => {
    const tokens: Token[] = [];
    for (const match of matches) {
      const word = match[1];
      if (word) {
        const wordNormal = normalize(word);
        wordCount[wordNormal] = (wordCount[wordNormal] || 0) + 1;
        const token: Token = {
          value: word,
          wordNormal,
          id: `${base64encode(wordNormal).replace(/=/g, "a")}${
            wordCount[wordNormal] - 1
          }`,
          redacted: shouldRedact(wordNormal),
          highlight: wordNormal === selectedWord,
        };
        if (!tokenLookup[wordNormal]) {
          tokenLookup[wordNormal] = [];
        }
        tokenLookup[wordNormal].push(token);
        tokens.push(token);
      }
      if (match[2]) {
        tokens.push({
          value: match[2],
          wordNormal: "",
          id: "",
          redacted: false,
          highlight: false,
        });
      }
    }
    return tokens;
  };

  // Check if word should be redacted
  // Decide whether a normalized word should be redacted.
  // Accepts optional overrides so callers can pass an updated `guesses` or `solved` state
  // (useful when updating `gameState` and re-rendering immediately).
  const shouldRedact = (
    wordNormal: string,
    debugOverride?: boolean,
    guessesOverride?: Record<string, number>,
    revealedOverride?: Record<string, boolean>,
    solvedOverride?: boolean
  ): boolean => {
    const debug = debugOverride !== undefined ? debugOverride : debugRevealAll;
    if (debug) return false;
    const gState =
      guessesOverride !== undefined ||
      revealedOverride !== undefined ||
      solvedOverride !== undefined
        ? {
            guesses: guessesOverride || {},
            revealed: revealedOverride || {},
            solved: !!solvedOverride,
          }
        : gameState;
    if (!gState) return true;
    if ((gState as any).solved) return false;
    if (commonWordsDict[wordNormal]) return false;
    // If the word was directly guessed or if it was revealed as part of a matched variant
    if (
      (gState as any).guesses &&
      (gState as any).guesses[wordNormal] !== undefined
    )
      return false;
    if ((gState as any).revealed && (gState as any).revealed[wordNormal])
      return false;
    return true;
  };

  // Render tokens with current state
  const renderTokens = (
    sectionsToRender: Section[],
    wordCountToUse: Record<string, number>,
    tokenLookupToUse: Record<string, Token[]>,
    debugOverride?: boolean,
    guessesOverride?: Record<string, number>,
    revealedOverride?: Record<string, boolean>,
    lastRevealedOverride?: Record<string, boolean>,
    solvedOverride?: boolean
  ) => {
    const updatedSections = sectionsToRender.map((section) => ({
      ...section,
      tokens: section.tokens.map((token) => {
        if (token.wordNormal) {
          return {
            ...token,
            redacted: shouldRedact(
              token.wordNormal,
              debugOverride,
              guessesOverride,
              revealedOverride,
              solvedOverride
            ),
            highlight:
              token.wordNormal === selectedWord ||
              !!(lastRevealedOverride
                ? lastRevealedOverride[token.wordNormal]
                : lastRevealed[token.wordNormal]),
          };
        }
        return token;
      }),
    }));
    setSections(updatedSections);
  };

  // Initialize game
  useEffect(() => {
    const initializeGame = () => {
      const savedState = localStorage.getItem("redactle_turkish_state");
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          setGameState(parsed);
          return;
        } catch (e) {
          console.error("Error parsing saved state:", e);
        }
      }

      // New game - use fixed article title
      const newState = {
        urlTitle: "İstanbul Teknik Üniversitesi",
        guesses: {},
        revealed: {},
        solved: false,
      };
      setGameState(newState);
      localStorage.setItem("redactle_turkish_state", JSON.stringify(newState));
    };

    initializeGame();
  }, []);

  // Load article when game state is ready
  useEffect(() => {
    if (gameState) {
      loadArticle();
    }
  }, [gameState?.urlTitle]);

  // Save game state
  useEffect(() => {
    if (gameState) {
      localStorage.setItem("redactle_turkish_state", JSON.stringify(gameState));
    }
  }, [gameState]);

  // Handle guess submission
  const handleGuess = () => {
    if (!currentGuess.trim() || !gameState) return;

    const guessNormalized = normalize(currentGuess.trim());

    // Validate guess
    if (commonWordsDict[guessNormalized]) {
      setMessage("Bu kelime çok yaygın, tahmin edilemez!");
      setTimeout(() => setMessage(""), 2000);
      setCurrentGuess("");
      return;
    }

    if (
      !/^[\w\u0130\u0131\u011E\u011F\u015E\u015F\u00C7\u00E7\u00D6\u00F6\u00DC\u00FC]+$/.test(
        guessNormalized
      )
    ) {
      setMessage("Geçersiz kelime!");
      setTimeout(() => setMessage(""), 2000);
      setCurrentGuess("");
      return;
    }

    // Save current guesses + revealed to undo stack so the user can revert this action
    setUndoStack((s) => [
      ...s,
      {
        guesses: { ...(gameState?.guesses || {}) },
        revealed: { ...((gameState as any)?.revealed || {}) },
      },
    ]);

    // Determine matching variants from tokenLookup (cover inflections)
    const matches = getMatchingVariants(guessNormalized);

    // Consider 'already' only if the exact entered word was already guessed.
    const already = gameState.guesses[guessNormalized] !== undefined;
    if (already) {
      setMessage("Bu kelimeyi zaten tahmin ettiniz!");
      setTimeout(() => setMessage(""), 2000);
      setCurrentGuess("");
      return;
    }

    // Update guesses and mark matched variants as revealed. The guesses list
    // should contain only what the user typed (guessNormalized), while the
    // 'revealed' map marks all variants that should be shown in the text.
    const updatedGuesses: Record<string, number> = { ...gameState.guesses };
    const updatedRevealed: Record<string, boolean> = {
      ...(gameState.revealed || {}),
    };
    // mark all matched variants as revealed and record which ones were opened by this guess
    const newlyRevealed: Record<string, boolean> = {};
    if (matches.length > 0) {
      matches.forEach((m) => {
        updatedRevealed[m] = true;
        newlyRevealed[m] = true;
      });
    }
    // compute total occurrences for the guessed word: sum occurrences of all matched variants
    let totalCount = 0;
    if (matches.length > 0) {
      totalCount = matches.reduce((s, m) => s + (wordCount[m] || 0), 0);
    }
    // if there were no matches found, fall back to the direct word count
    if (totalCount === 0) {
      totalCount = wordCount[guessNormalized] || 0;
      newlyRevealed[guessNormalized] = true;
      updatedRevealed[guessNormalized] = true;
    }
    // always record the exact user guess in guesses map, with the summed count
    updatedGuesses[guessNormalized] = totalCount;
    // set lastRevealed so we can highlight tokens opened by this guess
    setLastRevealed(newlyRevealed);

    const updatedState = {
      ...gameState,
      guesses: updatedGuesses,
      revealed: updatedRevealed,
    };

    // Check if solved (all words in title are revealed)
    if (sections.length > 0 && sections[0].headline) {
      const titleTokens = sections[0].tokens.filter((t) => t.wordNormal);
      const allTitleWordsRevealed = titleTokens.every(
        (token) =>
          !token.wordNormal ||
          !shouldRedact(
            token.wordNormal,
            undefined,
            updatedGuesses,
            updatedRevealed,
            false
          )
      );
      if (allTitleWordsRevealed && titleTokens.length > 0) {
        updatedState.solved = true;
        // Reveal all words when solved
        const allWords = Object.keys(wordCount);
        allWords.forEach((word) => {
          updatedRevealed[word] = true;
        });
        updatedState.revealed = updatedRevealed;
        setMessage("Tebrikler! Makaleyi çözdünüz!");
      }
    }

    setGameState(updatedState);
    // Re-render tokens using the updated guesses and revealed map so the correct guess/variants are revealed immediately
    // If solved, reveal all words
    if (updatedState.solved) {
      renderTokens(
        sections,
        wordCount,
        tokenLookup,
        false,
        updatedState.guesses,
        updatedState.revealed,
        {},
        true
      );
    } else {
      renderTokens(
        sections,
        wordCount,
        tokenLookup,
        undefined,
        updatedState.guesses,
        updatedState.revealed,
        newlyRevealed,
        updatedState.solved
      );
    }
    setCurrentGuess("");
  };

  // Undo the last guess action (restore previous guesses snapshot)
  const handleUndo = () => {
    if (!gameState) return;
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const newStack = [...prev];
      const last = newStack.pop();
      const restoredGuesses = (last && last.guesses) || {};
      const restoredRevealed = (last && last.revealed) || {};
      const updatedState = {
        ...gameState,
        guesses: restoredGuesses,
        revealed: restoredRevealed,
      };
      setGameState(updatedState);
      // Re-render tokens with restored guesses and revealed
      renderTokens(
        sections,
        wordCount,
        tokenLookup,
        undefined,
        restoredGuesses,
        restoredRevealed,
        {},
        updatedState.solved
      );
      setMessage("Son tahmin geri alındı");
      setTimeout(() => setMessage(""), 1500);
      // clear lastRevealed because the last action was undone
      setLastRevealed({});
      return newStack;
    });
  };

  // Clear all guesses (but keep the same article). Push current state to undo stack so user can undo.
  const handleClearGuesses = () => {
    if (!gameState) return;
    setUndoStack((s) => [
      ...s,
      {
        guesses: { ...(gameState.guesses || {}) },
        revealed: { ...((gameState as any).revealed || {}) },
      },
    ]);
    const updatedState = { ...gameState, guesses: {} };
    setGameState(updatedState);
    renderTokens(
      sections,
      wordCount,
      tokenLookup,
      undefined,
      {},
      {},
      {},
      updatedState.solved
    );
    setSelectedWord("");
    setMessage("Tüm tahminler silindi");
    setTimeout(() => setMessage(""), 1500);
    setLastRevealed({});
  };

  // Select word to highlight
  const selectWord = (wordNormal: string) => {
    setSelectedWord(wordNormal);
    // find token entries for this word
    const tokens = tokenLookup[wordNormal] || [];
    if (tokens.length === 0) {
      // still re-render to highlight selection
      renderTokens(sections, wordCount, tokenLookup);
      return;
    }

    // pick next index for this word
    const prevIdx = lastScrollIndex[wordNormal] || 0;
    const idx = prevIdx % tokens.length;
    const tokenId = tokens[idx].id;
    // update index for next click
    setLastScrollIndex((s) => ({
      ...s,
      [wordNormal]: (idx + 1) % tokens.length,
    }));

    // render with selection/highlight while we scroll
    renderTokens(sections, wordCount, tokenLookup);

    // scroll the element into view inside the article container
    setTimeout(() => {
      const el = tokenId ? document.getElementById(tokenId) : null;
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      } else if (articleRef.current) {
        // fallback: scroll to top
        articleRef.current.scrollTop = 0;
      }
    }, 50);
  };

  // Get accuracy percentage
  const getAccuracyPercent = (): string => {
    if (!gameState) return "0";
    const guessCount = Object.keys(gameState.guesses).length;
    if (guessCount === 0) return "0";
    const hits = Object.values(gameState.guesses).filter((x) => x > 0).length;
    const accuracy = hits / guessCount;
    return `${Math.round(accuracy * 10000) / 100}`;
  };

  const resetGame = () => {
    const newState = {
      urlTitle: "İstanbul Teknik Üniversitesi",
      guesses: {},
      revealed: {},
      solved: false,
    };
    setGameState(newState);
    setCurrentGuess("");
    setSelectedWord("");
    setMessage("");
    setSections([]);
    setWordCount({});
    setTokenLookup({});
    setUndoStack([]);
    setLastRevealed({});
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header - fixed */}
      <header className="fixed top-0 left-0 right-80 bg-slate-900 z-20 px-8 pt-4 pb-4 border-b border-slate-700">
        {/* Top row: Back button | Title | Menu */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="p-2 hover:bg-slate-800 rounded transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>

          <h1 className="text-2xl font-bold">REDACTLE</h1>

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
                        setShowHowToPlay(true);
                        setShowMenu(false);
                      }}
                    >
                      <HelpCircle className="w-5 h-5" />
                      <span>Nasıl Oynanır</span>
                    </button>
                    <button
                      className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3"
                      onClick={() => {
                        const newVal = !debugRevealAll;
                        setDebugRevealAll(newVal);
                        renderTokens(sections, wordCount, tokenLookup, newVal);
                        setMessage(
                          newVal ? "DEBUG: Tüm kelimeler gösteriliyor" : ""
                        );
                        if (!newVal) setTimeout(() => setMessage(""), 600);
                        setShowMenu(false);
                      }}
                    >
                      <span>{debugRevealAll ? "Gizle" : "Tümünü Göster"}</span>
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

        {/* Game info */}
        {!gameState?.solved && (
          <div className="flex items-center gap-4 text-sm font-semibold">
            <span>
              Tahmin:{" "}
              <span className="text-slate-400">
                {Object.keys(gameState?.guesses || {}).length}
              </span>
            </span>
            {gameState && Object.keys(gameState.guesses).length > 0 && (
              <span>
                Doğruluk:{" "}
                <span className="text-emerald-400">
                  %{getAccuracyPercent()}
                </span>
              </span>
            )}
          </div>
        )}
      </header>

      {/* Content wrapper with padding for fixed header */}
      <div className="pt-24 pr-80">
        {/* Success State - Contexto style */}
        {gameState?.solved && (
          <div className="mb-10 mx-8 bg-slate-800 rounded-lg p-6 text-center border-2 border-emerald-600">
            <h2 className="text-2xl font-bold mb-3 text-emerald-500">
              Tebrikler!
            </h2>

            {/* Oyun Bilgileri */}
            <div className="mb-3 flex items-center justify-center gap-4 text-sm font-semibold">
              <span className="text-slate-500">
                Tahmin:{" "}
                <span className="text-slate-400">
                  {Object.keys(gameState.guesses).length}
                </span>
              </span>
              <span className="text-slate-500">
                Doğruluk:{" "}
                <span className="text-emerald-400">
                  %{getAccuracyPercent()}
                </span>
              </span>
            </div>

            {/* Makale Başlığı */}
            <p className="text-lg mb-4">
              Makaleyi buldunuz:{" "}
              <span className="font-bold text-emerald-500">
                {gameState.urlTitle.toUpperCase()}
              </span>
            </p>

            {/* Tahmin İstatistikleri */}
            <div className="mb-4 space-y-2 max-w-md mx-auto flex flex-col items-center">
              {(() => {
                const successfulGuesses = Object.values(
                  gameState.guesses
                ).filter((count) => count > 0).length;
                const failedGuesses = Object.values(gameState.guesses).filter(
                  (count) => count === 0
                ).length;

                return (
                  <>
                    {successfulGuesses > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {Array.from({
                            length: Math.ceil(successfulGuesses / 15),
                          }).map((_, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 bg-emerald-600"
                            ></div>
                          ))}
                        </div>
                        <span className="font-semibold text-sm min-w-[2rem] text-right">
                          {successfulGuesses} başarılı
                        </span>
                      </div>
                    )}

                    {failedGuesses > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {Array.from({
                            length: Math.ceil(failedGuesses / 15),
                          }).map((_, i) => (
                            <div key={i} className="w-4 h-4 bg-slate-600"></div>
                          ))}
                        </div>
                        <span className="font-semibold text-sm min-w-[2rem] text-right">
                          {failedGuesses} başarısız
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={resetGame}
                className="px-6 py-2 rounded-md bg-emerald-600 text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Yeni Oyun
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex relative">
          {/* Article area - full width, scrollable with page */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="text-center text-slate-400 text-lg py-20">
                Makale yükleniyor...
              </div>
            ) : (
              <div
                ref={(el) => {
                  articleRef.current = el ?? null;
                }}
                className="text-slate-200 text-lg leading-loose px-8 py-6"
              >
                {sections.map((section, sectionIdx) => (
                  <div
                    key={sectionIdx}
                    className={section.headline ? "mb-6" : "mb-4"}
                  >
                    {section.headline ? (
                      <h2 className="text-2xl font-bold text-slate-100 mb-2">
                        {section.tokens.map((token, tokenIdx) => {
                          // If token has no wordNormal, it's a space/punctuation - render directly
                          if (!token.wordNormal) {
                            return <span key={tokenIdx}>{token.value}</span>;
                          }
                          return (
                            <span
                              key={tokenIdx}
                              className="relative inline-block"
                            >
                              <span
                                id={token.id}
                                className={`${
                                  token.highlight
                                    ? "bg-emerald-700 text-white"
                                    : ""
                                } ${
                                  token.redacted
                                    ? "bg-slate-700 text-slate-700 select-none mb-2 align-top"
                                    : "text-slate-100"
                                }`}
                                style={{
                                  cursor: token.redacted
                                    ? "pointer"
                                    : "default",
                                }}
                                onClick={() => {
                                  if (token.redacted && token.id) {
                                    setClickedTokenId(token.id);
                                    setTimeout(
                                      () => setClickedTokenId(null),
                                      2000
                                    );
                                  }
                                }}
                              >
                                {token.redacted
                                  ? "█".repeat(Math.max(token.value.length, 3))
                                  : token.value}
                              </span>
                              {clickedTokenId === token.id &&
                                token.redacted && (
                                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap z-50">
                                    {token.value.length} harf
                                  </span>
                                )}
                            </span>
                          );
                        })}
                      </h2>
                    ) : (
                      <p className="mb-4">
                        {section.tokens.map((token, tokenIdx) => {
                          // If token has no wordNormal, it's a space/punctuation - render directly
                          if (!token.wordNormal) {
                            return <span key={tokenIdx}>{token.value}</span>;
                          }
                          return (
                            <span
                              key={tokenIdx}
                              className="relative inline-block"
                            >
                              <span
                                id={token.id}
                                className={`${
                                  token.highlight
                                    ? "bg-emerald-700 text-white"
                                    : ""
                                } ${
                                  token.redacted
                                    ? "bg-slate-700 text-slate-700 select-none mb-2 align-top"
                                    : "text-slate-200"
                                }`}
                                style={{
                                  cursor: token.redacted
                                    ? "pointer"
                                    : "default",
                                }}
                                onClick={() => {
                                  if (token.redacted && token.id) {
                                    setClickedTokenId(token.id);
                                    setTimeout(
                                      () => setClickedTokenId(null),
                                      2000
                                    );
                                  }
                                }}
                              >
                                {token.redacted
                                  ? "█".repeat(Math.max(token.value.length, 3))
                                  : token.value}
                              </span>
                              {clickedTokenId === token.id &&
                                token.redacted && (
                                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap z-50">
                                    {token.value.length} harf
                                  </span>
                                )}
                            </span>
                          );
                        })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Sidebar - fixed position */}
          <aside className="fixed right-0 top-0 w-80 bg-slate-800 border-l border-slate-700 p-4 text-slate-200 flex flex-col h-screen overflow-y-auto z-10">
            {/* Input Form - only show if game not solved */}
            {!gameState?.solved && !loading && (
              <div className="mb-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleGuess();
                  }}
                >
                  <input
                    type="text"
                    className="w-full rounded-md bg-slate-700 border border-slate-600 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 placeholder:text-slate-500 transition-all"
                    placeholder="Bir kelime yaz..."
                    value={currentGuess}
                    onChange={(e) => setCurrentGuess(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleGuess()}
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !currentGuess.trim()}
                    className="w-full mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    TAHMİN ET
                  </button>
                </form>
              </div>
            )}

            {/* Message - shown in sidebar */}
            {message && (
              <div className="mb-4 bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-center">
                <p className="text-xs text-slate-200">{message}</p>
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-sm text-slate-400 mb-2 font-semibold">
                Tahminler ({Object.keys(gameState?.guesses || {}).length})
              </h3>
              <div className="space-y-2">
                {gameState && Object.keys(gameState.guesses).length === 0 && (
                  <div className="text-slate-500 text-sm text-center py-4">
                    Henüz tahmin yapılmadı
                  </div>
                )}
                {gameState &&
                  Object.keys(gameState.guesses)
                    .reverse()
                    .map((word, idx) => {
                      const count = gameState.guesses[word];
                      return (
                        <div
                          key={idx}
                          onClick={() => selectWord(word)}
                          className={`flex justify-between items-center px-3 py-2 rounded cursor-pointer transition-colors ${
                            count > 0
                              ? "bg-slate-700 hover:bg-slate-600"
                              : "bg-slate-700/50 hover:bg-slate-700"
                          }`}
                        >
                          <div className="font-semibold">{word}</div>
                          <div className="text-sm text-slate-400">{count}</div>
                        </div>
                      );
                    })}
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-700 space-y-2">
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className={`w-full px-3 py-2 rounded font-semibold transition-colors ${
                  undoStack.length === 0
                    ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                    : "bg-slate-700 text-white hover:bg-slate-600"
                }`}
              >
                Geri Al
              </button>

              <button
                onClick={handleClearGuesses}
                className="w-full px-3 py-2 bg-slate-700 text-white rounded font-semibold hover:bg-slate-600 transition-colors"
              >
                Tahminleri Temizle
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div
          className="fixed inset-0 bg-[#00000075] flex items-center justify-center p-4 z-50"
          onClick={() => setShowHowToPlay(false)}
        >
          <div
            className="bg-slate-800 rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-slate-800 flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="text-2xl">❓</span> Nasıl Oynanır
              </h2>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="text-slate-400 hover:text-slate-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-slate-200">
              <p className="text-base leading-relaxed">
                Kelimeleri tahmin ederek gizli makaleyi ortaya çıkarın.
              </p>
              <p className="text-base leading-relaxed">
                Makaledeki kelimeler gizlenmiştir. Doğru kelimeleri tahmin
                ederek makaleyi çözün.
              </p>
              <p className="text-base leading-relaxed">
                Başlıktaki tüm kelimeleri açtığınızda oyunu kazanırsınız.
              </p>
              <p className="text-base leading-relaxed">
                Çok yaygın kelimeler (bir, bu, ve, gibi) otomatik olarak
                gösterilir.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Redactle;
