"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { SAMPLE_ARTICLES, TURKISH_ARTICLE_TITLES } from "./sample-articles";

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

  // Base64 encode/decode
  const base64encode = (str: string): string => {
    const encode = encodeURIComponent(str).replace(
      /%([a-f0-9]{2})/gi,
      (m, $1) => String.fromCharCode(parseInt($1, 16))
    );
    return btoa(encode);
  };

  const base64decode = (str: string): string => {
    const decode = atob(str).replace(
      /[\x80-\uffff]/g,
      (m) => `%${m.charCodeAt(0).toString(16).padStart(2, "0")}`
    );
    return decodeURIComponent(decode);
  };

  // Get text from HTML (strip tags, remove citations, etc.)
  const getText = (html: string): string => {
    if (typeof window === "undefined") return "";

    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(html, "text/html");

    // Remove unwanted elements
    const tagsToRemove = ["style", "table", "figure"];
    tagsToRemove.forEach((tag) => {
      const nodes = Array.from(htmlDoc.getElementsByTagName(tag));
      nodes.forEach((node) => node.remove());
    });

    const classesToRemove = [
      "navigation-not-searchable",
      "thumbinner",
      "gallery",
      "infobox",
      "hatnote",
      "thumb",
    ];
    classesToRemove.forEach((className) => {
      const nodes = Array.from(htmlDoc.getElementsByClassName(className));
      nodes.forEach((node) => node.remove());
    });

    let text = htmlDoc.body.innerHTML;
    // Remove HTML tags
    text = text.replace(/<[^>]*>/g, " ");
    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    // Remove citations
    text = text.replace(/\[\d+\]/gi, "");
    return text;
  };

  // Load article from Wikipedia API or fallback to sample
  const loadArticle = useCallback(async () => {
    if (!gameState) return;

    setLoading(true);
    try {
      // First, try to load from Wikipedia API
      try {
        const response = await fetch(
          `https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
            gameState.urlTitle
          )}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Api-User-Agent": "WordlelikeGames/1.0",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();

          const newSections: Section[] = [];
          const newWordCount: Record<string, number> = {};
          const newTokenLookup: Record<string, Token[]> = {};

          // Add title
          const title = data.title || gameState.urlTitle;
          const titleMatches = [...title.matchAll(TURKISH_WORD_REGEX)];
          const titleTokens = getTokens(
            titleMatches,
            newWordCount,
            newTokenLookup,
            true
          );
          newSections.push({ headline: true, tokens: titleTokens });

          // Add extract
          if (data.extract) {
            const textMatches = [...data.extract.matchAll(TURKISH_WORD_REGEX)];
            const textTokens = getTokens(
              textMatches,
              newWordCount,
              newTokenLookup,
              false
            );
            newSections.push({ headline: false, tokens: textTokens });
          }

          setSections(newSections);
          setWordCount(newWordCount);
          setTokenLookup(newTokenLookup);
          renderTokens(newSections, newWordCount, newTokenLookup);
          setLoading(false);
          return;
        }
      } catch (apiError) {
        console.log("Wikipedia API failed, using fallback:", apiError);
      }

      // Fallback to sample articles
      const article =
        SAMPLE_ARTICLES[gameState.urlTitle as keyof typeof SAMPLE_ARTICLES];

      if (!article) {
        throw new Error("Makale bulunamadı");
      }

      const newSections: Section[] = [];
      const newWordCount: Record<string, number> = {};
      const newTokenLookup: Record<string, Token[]> = {};

      // Add title as headline
      const titleMatches = [...article.title.matchAll(TURKISH_WORD_REGEX)];
      const titleTokens = getTokens(
        titleMatches,
        newWordCount,
        newTokenLookup,
        true
      );
      newSections.push({ headline: true, tokens: titleTokens });

      // Add content
      const textMatches = [...article.content.matchAll(TURKISH_WORD_REGEX)];
      const textTokens = getTokens(
        textMatches,
        newWordCount,
        newTokenLookup,
        false
      );
      newSections.push({ headline: false, tokens: textTokens });

      setSections(newSections);
      setWordCount(newWordCount);
      setTokenLookup(newTokenLookup);
      renderTokens(newSections, newWordCount, newTokenLookup);
    } catch (error) {
      console.error("Error loading article:", error);
      setMessage(
        error instanceof Error
          ? `Hata: ${error.message}`
          : "Makale yüklenirken hata oluştu. Wikipedia'ya erişilemiyor."
      );
      // Fallback to a simple demo article
      const demoSections: Section[] = [
        {
          headline: true,
          tokens: [
            {
              value: "Türkiye",
              wordNormal: "turkiye",
              id: "demo1",
              redacted: false,
              highlight: false,
            },
          ],
        },
        {
          headline: false,
          tokens: [
            {
              value: "Türkiye",
              wordNormal: "turkiye",
              id: "demo2",
              redacted: true,
              highlight: false,
            },
            {
              value: " ",
              wordNormal: "",
              id: "",
              redacted: false,
              highlight: false,
            },
            {
              value: "Asya",
              wordNormal: "asya",
              id: "demo3",
              redacted: true,
              highlight: false,
            },
            {
              value: " ve ",
              wordNormal: "",
              id: "",
              redacted: false,
              highlight: false,
            },
            {
              value: "Avrupa",
              wordNormal: "avrupa",
              id: "demo4",
              redacted: true,
              highlight: false,
            },
            {
              value: " ",
              wordNormal: "",
              id: "",
              redacted: false,
              highlight: false,
            },
            {
              value: "kıtaları",
              wordNormal: "kitalari",
              id: "demo5",
              redacted: true,
              highlight: false,
            },
            {
              value: " arasında yer alan bir ",
              wordNormal: "",
              id: "",
              redacted: false,
              highlight: false,
            },
            {
              value: "ülkedir",
              wordNormal: "ulkedir",
              id: "demo6",
              redacted: true,
              highlight: false,
            },
            {
              value: ".",
              wordNormal: "",
              id: "",
              redacted: false,
              highlight: false,
            },
          ],
        },
      ];
      setSections(demoSections);
      setWordCount({ turkiye: 1, asya: 1, avrupa: 1, kitalari: 1, ulkedir: 1 });
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
    solvedOverride?: boolean
  ): boolean => {
    const debug = debugOverride !== undefined ? debugOverride : debugRevealAll;
    if (debug) return false;
    const gState = guessesOverride !== undefined ? { guesses: guessesOverride, solved: !!solvedOverride } : gameState;
    if (!gState) return true;
    if (gState.solved) return false;
    if (commonWordsDict[wordNormal]) return false;
    if ((gState.guesses && gState.guesses[wordNormal] !== undefined)) return false;
    return true;
  };

  // Render tokens with current state
  const renderTokens = (
    sectionsToRender: Section[],
    wordCountToUse: Record<string, number>,
    tokenLookupToUse: Record<string, Token[]>,
    debugOverride?: boolean,
    guessesOverride?: Record<string, number>,
    solvedOverride?: boolean
  ) => {
    const updatedSections = sectionsToRender.map((section) => ({
      ...section,
      tokens: section.tokens.map((token) => {
        if (token.wordNormal) {
          return {
            ...token,
            redacted: shouldRedact(token.wordNormal, debugOverride, guessesOverride, solvedOverride),
            highlight: token.wordNormal === selectedWord,
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

      // New game - pick random article (decode from base64)
      const encodedTitle =
        TURKISH_ARTICLE_TITLES[
          Math.floor(Math.random() * TURKISH_ARTICLE_TITLES.length)
        ];
      const randomTitle = base64decode(encodedTitle);
      const newState = {
        urlTitle: randomTitle,
        guesses: {},
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

    // Check if already guessed
    if (gameState.guesses[guessNormalized] !== undefined) {
      setMessage("Bu kelimeyi zaten tahmin ettiniz!");
      setTimeout(() => setMessage(""), 2000);
      setCurrentGuess("");
      return;
    }

    // Add guess
    const count = wordCount[guessNormalized] || 0;
    const updatedGuesses = {
      ...gameState.guesses,
      [guessNormalized]: count,
    };

    const updatedState = {
      ...gameState,
      guesses: updatedGuesses,
    };

    // Check if solved (all words in title are revealed)
    if (sections.length > 0 && sections[0].headline) {
      const titleRedacted = sections[0].tokens.some(
        (token) => token.wordNormal && shouldRedact(token.wordNormal)
      );
      if (!titleRedacted) {
        updatedState.solved = true;
        setMessage("Tebrikler! Makaleyi çözdünüz!");
      }
    }

    setGameState(updatedState);
    // Re-render tokens using the updated guesses so the correct guess is revealed immediately
    renderTokens(sections, wordCount, tokenLookup, undefined, updatedState.guesses, updatedState.solved);
    setCurrentGuess("");
  };

  // Select word to highlight
  const selectWord = (wordNormal: string) => {
    setSelectedWord(wordNormal);
    renderTokens(sections, wordCount, tokenLookup);
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
    const encodedTitle =
      TURKISH_ARTICLE_TITLES[
        Math.floor(Math.random() * TURKISH_ARTICLE_TITLES.length)
      ];
    const randomTitle = base64decode(encodedTitle);
    const newState = {
      urlTitle: randomTitle,
      guesses: {},
      solved: false,
    };
    setGameState(newState);
    setCurrentGuess("");
    setSelectedWord("");
    setMessage("");
    setSections([]);
    setWordCount({});
    setTokenLookup({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-cyan-800 to-blue-900 flex flex-col items-center justify-center p-4">
      <Link
        href="/"
        className="absolute top-4 left-4 text-white hover:text-blue-300 transition-colors"
      >
        ← Back to Games
      </Link>

      <div className="max-w-6xl w-full">
        <h1 className="text-4xl font-bold text-white text-center mb-2">
          REDACTLE (TÜRKÇE)
        </h1>
        <p className="text-center text-blue-200 mb-6">
          Kelimeleri tahmin ederek gizli makaleyi ortaya çıkarın
        </p>

        {message && (
          <div className="text-center mb-4 p-2 bg-white/20 rounded text-white">
            {message}
          </div>
        )}

        {gameState?.solved && (
          <div className="text-center mb-4 p-4 bg-green-500/30 rounded text-white text-xl font-bold">
            Tebrikler! Makaleyi {Object.keys(gameState.guesses).length} tahminle
            %{getAccuracyPercent()} doğrulukla çözdünüz!
          </div>
        )}

        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={currentGuess}
              onChange={(e) => setCurrentGuess(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleGuess()}
              placeholder="Bir kelime tahmin edin..."
              disabled={gameState?.solved || loading}
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/50 border-2 border-blue-400 focus:outline-none focus:border-blue-300"
            />
            <button
              onClick={handleGuess}
              disabled={gameState?.solved || loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-semibold disabled:opacity-50"
            >
              Tahmin Et
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-white text-xl py-20">
            Makale yükleniyor...
          </div>
        ) : (
          <div className="bg-black/30 p-6 rounded-lg mb-6 min-h-[200px] text-lg leading-relaxed max-h-[600px] overflow-y-auto">
            {sections.map((section, sectionIdx) => (
              <div
                key={sectionIdx}
                className={section.headline ? "mb-4" : "mb-2"}
              >
                {section.headline ? (
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {section.tokens.map((token, tokenIdx) => (
                      <span
                        key={tokenIdx}
                        className={`${
                          token.highlight ? "bg-cyan-500 text-black" : ""
                        } ${
                          token.redacted
                            ? "bg-gray-700 text-gray-700 select-none"
                            : "text-white"
                        }`}
                        style={{
                          cursor: token.redacted ? "pointer" : "default",
                        }}
                      >
                        {token.redacted
                          ? "█".repeat(Math.max(token.value.length, 3))
                          : token.value}
                      </span>
                    ))}
                  </h2>
                ) : (
                  <p className="text-white">
                    {section.tokens.map((token, tokenIdx) => (
                      <span
                        key={tokenIdx}
                        className={`${
                          token.highlight ? "bg-cyan-500 text-black" : ""
                        } ${
                          token.redacted
                            ? "bg-gray-700 text-gray-700 select-none"
                            : "text-white"
                        }`}
                        style={{
                          cursor: token.redacted ? "pointer" : "default",
                        }}
                      >
                        {token.redacted
                          ? "█".repeat(Math.max(token.value.length, 3))
                          : token.value}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {gameState && (
          <div className="mb-4">
            <h3 className="text-white font-semibold mb-2">
              Tahminler ({Object.keys(gameState.guesses).length}):
            </h3>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {Object.keys(gameState.guesses)
                .reverse()
                .map((word, idx) => {
                  const count = gameState.guesses[word];
                  return (
                    <span
                      key={idx}
                      onClick={() => selectWord(word)}
                      className={`px-3 py-1 rounded cursor-pointer ${
                        count > 0
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-red-500 text-white hover:bg-red-600"
                      } ${selectedWord === word ? "ring-2 ring-cyan-400" : ""}`}
                    >
                      <b>{word}</b> ({count})
                    </span>
                  );
                })}
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => {
              const newVal = !debugRevealAll;
              setDebugRevealAll(newVal);
              // Re-render tokens immediately with the chosen debug flag
              renderTokens(sections, wordCount, tokenLookup, newVal);
              setMessage(newVal ? "DEBUG: Tüm kelimeler gösteriliyor" : "");
              if (!newVal) setTimeout(() => setMessage(""), 600);
            }}
            className="mr-3 px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-colors"
          >
            {debugRevealAll ? "Gizle" : "Tümünü Göster (Debug)"}
          </button>

          <button
            onClick={resetGame}
            className="px-6 py-2 bg-white text-blue-800 font-bold rounded-lg hover:bg-blue-100 transition-colors"
          >
            Yeni Makale
          </button>
        </div>
      </div>
    </div>
  );
};

export default Redactle;
