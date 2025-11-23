"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const [undoStack, setUndoStack] = useState<Array<{guesses: Record<string, number>, revealed?: Record<string, boolean>}>>([]);
  // Keys revealed by the last guess (used for blue highlighting)
  const [lastRevealed, setLastRevealed] = useState<Record<string, boolean>>({});
  // ref to the scrollable article container so we can scroll tokens into view
  const articleRef = useRef<HTMLDivElement | null>(null);
  // remember last scrolled index per word so repeated clicks go to next occurrence
  const [lastScrollIndex, setLastScrollIndex] = useState<Record<string, number>>({});

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
    for (const k of keys) {
      if (!k) continue;
      if (k === guessNorm) {
        matches.add(k);
        continue;
      }
      if (k.includes(guessNorm) || guessNorm.includes(k)) {
        matches.add(k);
        continue;
      }
      const kStem = stripTurkishSuffixes(k);
      if (kStem === guessStem) {
        matches.add(k);
      }
    }
    return Array.from(matches);
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

    // Prefer extracting paragraph text to preserve paragraph breaks.
    const pNodes = Array.from(htmlDoc.getElementsByTagName("p"));
    let text = "";
    if (pNodes.length > 0) {
      text = pNodes.map((p) => p.innerText).join("\n\n");
    } else {
      // Fallback to body text if no <p> elements found.
      text = htmlDoc.body.innerText || htmlDoc.body.textContent || "";
    }

    // Decode HTML entities and normalize spacing
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\r\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n");

    // Remove citation markers like [1]
    text = text.replace(/\[\d+\]/gi, "");
    return text;
  };

  // Load article from Wikipedia API or fallback to sample
  const loadArticle = useCallback(async () => {
    if (!gameState) return;

    setLoading(true);
    try {
      // First try our internal wiki proxy to get the full HTML for the article.
      try {
        const proxyResp = await fetch(`/api/wiki?title=${encodeURIComponent(gameState.urlTitle)}`);
        if (proxyResp.ok) {
          const proxyData = await proxyResp.json();
          const newSections: Section[] = [];
          const newWordCount: Record<string, number> = {};
          const newTokenLookup: Record<string, Token[]> = {};

          const title = proxyData.title || gameState.urlTitle;
          const titleMatches = [...title.matchAll(TURKISH_WORD_REGEX)];
          const titleTokens = getTokens(titleMatches, newWordCount, newTokenLookup, true);
          newSections.push({ headline: true, tokens: titleTokens });

          const text = getText(proxyData.html || "");
          const paragraphs = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
          for (const para of paragraphs) {
            const textMatches = [...para.matchAll(TURKISH_WORD_REGEX)];
            const textTokens = getTokens(textMatches, newWordCount, newTokenLookup, false);
            newSections.push({ headline: false, tokens: textTokens });
          }

          setSections(newSections);
          setWordCount(newWordCount);
          setTokenLookup(newTokenLookup);
          renderTokens(newSections, newWordCount, newTokenLookup);
          setLoading(false);
          return;
        }
      } catch (proxyErr) {
        console.log('Internal wiki proxy failed, continuing to summary API fallback', proxyErr);
      }
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
            const paragraphs = (data.extract || "").split(/\n{2,}/).map((s:any) => s.trim()).filter(Boolean);
            for (const para of paragraphs) {
              const textMatches = [...para.matchAll(TURKISH_WORD_REGEX)];
              const textTokens = getTokens(
                textMatches,
                newWordCount,
                newTokenLookup,
                false
              );
              newSections.push({ headline: false, tokens: textTokens });
            }
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
        // If the requested sample article is missing, don't throw — fall back
        // to the built-in demo article and show a brief message instead of
        // letting an uncaught exception reach the Next overlay.
        console.warn("Sample article not found, using demo fallback for:", gameState.urlTitle);
        setMessage("Makale bulunamadı — demo içerik gösteriliyor");
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
              { value: "Türkiye", wordNormal: "turkiye", id: "demo2", redacted: true, highlight: false },
              { value: " ", wordNormal: "", id: "", redacted: false, highlight: false },
              { value: "Asya", wordNormal: "asya", id: "demo3", redacted: true, highlight: false },
              { value: " ve ", wordNormal: "", id: "", redacted: false, highlight: false },
              { value: "Avrupa", wordNormal: "avrupa", id: "demo4", redacted: true, highlight: false },
              { value: " ", wordNormal: "", id: "", redacted: false, highlight: false },
              { value: "kıtaları", wordNormal: "kitalari", id: "demo5", redacted: true, highlight: false },
              { value: " arasında yer alan bir ", wordNormal: "", id: "", redacted: false, highlight: false },
              { value: "ülkedir", wordNormal: "ulkedir", id: "demo6", redacted: true, highlight: false },
              { value: ".", wordNormal: "", id: "", redacted: false, highlight: false },
            ],
          },
        ];
        setSections(demoSections);
        setWordCount({ turkiye: 1, asya: 1, avrupa: 1, kitalari: 1, ulkedir: 1 });
        setTokenLookup({});
        setLoading(false);
        return;
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

      // Add content split into paragraphs to preserve paragraph breaks
      const paragraphs = (article.content || "").split(/\n{2,}/).map((s:any) => s.trim()).filter(Boolean);
      for (const para of paragraphs) {
        const textMatches = [...para.matchAll(TURKISH_WORD_REGEX)];
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
    revealedOverride?: Record<string, boolean>,
    solvedOverride?: boolean
  ): boolean => {
    const debug = debugOverride !== undefined ? debugOverride : debugRevealAll;
    if (debug) return false;
    const gState = guessesOverride !== undefined || revealedOverride !== undefined || solvedOverride !== undefined
      ? { guesses: guessesOverride || {}, revealed: revealedOverride || {}, solved: !!solvedOverride }
      : gameState;
    if (!gState) return true;
    if ((gState as any).solved) return false;
    if (commonWordsDict[wordNormal]) return false;
    // If the word was directly guessed or if it was revealed as part of a matched variant
    if ((gState as any).guesses && (gState as any).guesses[wordNormal] !== undefined) return false;
    if ((gState as any).revealed && (gState as any).revealed[wordNormal]) return false;
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
            redacted: shouldRedact(token.wordNormal, debugOverride, guessesOverride, revealedOverride, solvedOverride),
            highlight:
              token.wordNormal === selectedWord || !!(lastRevealedOverride ? lastRevealedOverride[token.wordNormal] : lastRevealed[token.wordNormal]),
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
      { guesses: { ...(gameState?.guesses || {}) }, revealed: { ...((gameState as any)?.revealed || {}) } },
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
    const updatedRevealed: Record<string, boolean> = { ...(gameState.revealed || {}) };
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
      const titleRedacted = sections[0].tokens.some(
        (token) => token.wordNormal && shouldRedact(token.wordNormal)
      );
      if (!titleRedacted) {
        updatedState.solved = true;
        setMessage("Tebrikler! Makaleyi çözdünüz!");
      }
    }

    setGameState(updatedState);
    // Re-render tokens using the updated guesses and revealed map so the correct guess/variants are revealed immediately
    renderTokens(sections, wordCount, tokenLookup, undefined, updatedState.guesses, updatedState.revealed, newlyRevealed, updatedState.solved);
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
      const updatedState = { ...gameState, guesses: restoredGuesses, revealed: restoredRevealed };
      setGameState(updatedState);
      // Re-render tokens with restored guesses and revealed
      renderTokens(sections, wordCount, tokenLookup, undefined, restoredGuesses, restoredRevealed, {}, updatedState.solved);
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
    setUndoStack((s) => [...s, { guesses: { ...(gameState.guesses || {}) }, revealed: { ...((gameState as any).revealed || {}) } }]);
    const updatedState = { ...gameState, guesses: {} };
    setGameState(updatedState);
    renderTokens(sections, wordCount, tokenLookup, undefined, {}, {}, {}, updatedState.solved);
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
    setLastScrollIndex((s) => ({ ...s, [wordNormal]: (idx + 1) % tokens.length }));

    // render with selection/highlight while we scroll
    renderTokens(sections, wordCount, tokenLookup);

    // scroll the element into view inside the article container
    setTimeout(() => {
      const el = tokenId ? document.getElementById(tokenId) : null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
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
    const encodedTitle =
      TURKISH_ARTICLE_TITLES[
        Math.floor(Math.random() * TURKISH_ARTICLE_TITLES.length)
      ];
    const randomTitle = base64decode(encodedTitle);
    const newState = {
      urlTitle: randomTitle,
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-cyan-800 to-blue-900 flex flex-col items-center justify-center p-4">
      <Link
        href="/"
        className="absolute top-4 left-4 text-white hover:text-blue-300 transition-colors"
      >
        ← Back to Games
      </Link>

      <div className="w-full max-w-none px-8">
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
          <div className="text-center mb-4 p-4 bg-gray-600/30 rounded text-white text-xl font-bold">
            Tebrikler! Makaleyi {Object.keys(gameState.guesses).length} tahminle
            %{getAccuracyPercent()} doğrulukla çözdünüz!
          </div>
        )}

        <div className="flex gap-6 items-start">
          {/* Left: Article area */}
          <div className="flex-1">
            {loading ? (
              <div className="text-center text-gray-300 text-xl py-20">
                Makale yükleniyor...
              </div>
            ) : (
                  <div ref={(el) => { articleRef.current = el ?? null; }} className="bg-[#0b0e12] p-6 rounded-lg mb-6 text-gray-300 text-lg leading-loose h-[calc(100vh-8rem)] overflow-y-auto">
                {sections.map((section, sectionIdx) => (
                  <div key={sectionIdx} className={section.headline ? "mb-6" : "mb-4"}>
                    {section.headline ? (
                      <h2 className="text-2xl font-bold text-gray-100 mb-2">
                        {section.tokens.map((token, tokenIdx) => (
                          <span
                            id={token.id}
                            key={tokenIdx}
                            className={`${token.highlight ? "bg-cyan-500 text-black" : ""} ${
                              token.redacted
                                ? "bg-gray-800 text-gray-800 select-none inline-block mr-3 mb-2 rounded-sm align-top"
                                : "text-gray-100"
                            }`}
                            style={{ cursor: token.redacted ? "pointer" : "default" }}
                          >
                            {token.redacted ? "█".repeat(Math.max(token.value.length, 3)) : token.value}
                          </span>
                        ))}
                      </h2>
                    ) : (
                      <p className="mb-4">
                        {section.tokens.map((token, tokenIdx) => (
                          <span
                            id={token.id}
                            key={tokenIdx}
                            className={`${token.highlight ? "bg-cyan-500 text-black" : ""} ${
                              token.redacted
                                ? "bg-gray-800 text-gray-800 select-none inline-block mr-3 mb-2 -py-1 rounded-sm align-top"
                                : "text-gray-100"
                            }`}
                            style={{ cursor: token.redacted ? "pointer" : "default" }}
                          >
                            {token.redacted ? "█".repeat(Math.max(token.value.length, 3)) : token.value}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <aside className="w-80 bg-[#0b0f14] rounded-lg p-4 text-gray-200 flex flex-col sticky top-8 h-[calc(100vh-6rem)] overflow-y-auto self-start">
            <div className="mb-4">
              <input
                type="text"
                value={currentGuess}
                onChange={(e) => setCurrentGuess(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleGuess()}
                placeholder="Enter a word"
                disabled={gameState?.solved || loading}
                className="w-full px-3 py-2 rounded bg-[#0b1115] border border-gray-700 placeholder-gray-500 text-gray-100"
              />
              <button
                onClick={handleGuess}
                disabled={gameState?.solved || loading}
                className="w-full mt-3 px-3 py-2 bg-purple-600 text-white rounded font-semibold disabled:opacity-50"
              >
                GUESS
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-4">
              <h3 className="text-sm text-gray-400 mb-2">Guesses ({Object.keys(gameState?.guesses || {}).length})</h3>
              <div className="space-y-2">
                {gameState && Object.keys(gameState.guesses).length === 0 && (
                  <div className="text-gray-500 text-sm">No guesses yet</div>
                )}
                {gameState && Object.keys(gameState.guesses)
                  .reverse()
                  .map((word, idx) => {
                    const count = gameState.guesses[word];
                    return (
                      <div
                        key={idx}
                        onClick={() => selectWord(word)}
                        className={`flex justify-between items-center px-3 py-2 rounded cursor-pointer ${
                          count > 0 ? "bg-gray-600" : "bg-gray-700"
                        }`}
                      >
                        <div className="font-semibold">{word}</div>
                        <div className="text-sm">{count}</div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className={`px-3 py-2 rounded font-semibold ${undoStack.length === 0 ? 'bg-gray-500 text-gray-300' : 'bg-gray-700 text-white'}`}
              >
                Geri Al
              </button>

              <button
                onClick={() => {
                  const newVal = !debugRevealAll;
                  setDebugRevealAll(newVal);
                  renderTokens(sections, wordCount, tokenLookup, newVal);
                  setMessage(newVal ? "DEBUG: Tüm kelimeler gösteriliyor" : "");
                  if (!newVal) setTimeout(() => setMessage(""), 600);
                }}
                className="flex-1 px-3 py-2 bg-yellow-400 text-black font-semibold rounded"
              >
                {debugRevealAll ? "Hide" : "Show All"}
              </button>

              <button onClick={handleClearGuesses} className="px-3 py-2 bg-gray-500 text-white rounded font-semibold">
                Tahminleri Temizle
              </button>

              <button onClick={resetGame} className="px-3 py-2 bg-gray-200 text-black rounded font-semibold">
                New
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Redactle;
