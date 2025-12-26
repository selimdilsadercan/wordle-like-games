import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Maç bilgisini getir
export const getMatch = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.matchId);
  },
});

// Oyuncu durumunu getir
export const getPlayerState = query({
  args: { matchId: v.id("matches"), odaId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", args.odaId)
      )
      .first();
  },
});

// Rakip durumunu getir (kelime hariç sadece ilerleme ve renkler)
export const getOpponentState = query({
  args: { matchId: v.id("matches"), odaId: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;

    const opponentOdaId = match.odaId1 === args.odaId ? match.odaId2 : match.odaId1;
    
    const opponentState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", opponentOdaId)
      )
      .first();
    
    if (!opponentState) return null;

    // Rakibin tahminlerini gönder - harfleri gizle, sadece renkleri göster
    const colorGrid = opponentState.guesses.map((guess) => 
      guess.map((letter) => letter.state)
    );

    return {
      guessCount: opponentState.guesses.length,
      gameState: opponentState.gameState,
      finishedAt: opponentState.finishedAt,
      colorGrid, // Her satır için 5 renk durumu
      currentGuessLength: opponentState.currentGuess?.length || 0, // Rakibin anlık yazdığı harf sayısı
    };
  },
});

// Tahmin gönder
export const submitGuess = mutation({
  args: { 
    matchId: v.id("matches"), 
    odaId: v.string(),
    guess: v.string(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "playing") {
      return { success: false, error: "Maç aktif değil" };
    }
    
    const playerState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", args.odaId)
      )
      .first();
    
    if (!playerState || playerState.gameState !== "playing") {
      return { success: false, error: "Oyun durumu geçersiz" };
    }

    // Tahmini değerlendir
    const targetWord = match.targetWord;
    const guessArray = args.guess.split("");
    const targetArray = targetWord.split("");
    const used = new Array(5).fill(false);
    
    const evaluated: { letter: string; state: "correct" | "present" | "absent" | "empty" }[] = [];
    
    // İlk geçiş: doğru konumdaki harfler
    for (let i = 0; i < 5; i++) {
      if (guessArray[i] === targetArray[i]) {
        evaluated.push({ letter: guessArray[i], state: "correct" });
        used[i] = true;
      } else {
        evaluated.push({ letter: "", state: "empty" });
      }
    }
    
    // İkinci geçiş: var olan harfler
    for (let i = 0; i < 5; i++) {
      if (evaluated[i].state === "empty") {
        const letter = guessArray[i];
        const index = targetArray.findIndex((char, idx) => char === letter && !used[idx]);
        if (index !== -1) {
          evaluated[i] = { letter, state: "present" };
          used[index] = true;
        } else {
          evaluated[i] = { letter, state: "absent" };
        }
      }
    }
    
    const newGuesses = [...playerState.guesses, evaluated];
    const isWon = args.guess === targetWord;
    const isLost = newGuesses.length >= 6 && !isWon;
    
    // Oyuncu durumunu güncelle
    await ctx.db.patch(playerState._id, {
      guesses: newGuesses,
      currentGuess: "",
      gameState: isWon ? "won" : isLost ? "lost" : "playing",
      finishedAt: isWon || isLost ? Date.now() : undefined,
    });
    
    // Oyuncu kazandıysa maçı bitir
    if (isWon) {
      await ctx.db.patch(args.matchId, {
        status: "finished",
        winnerId: args.odaId,
        finishedAt: Date.now(),
      });
    }
    
    return { 
      success: true, 
      evaluated,
      gameState: isWon ? "won" : isLost ? "lost" : "playing",
    };
  },
});

// Current guess güncelle (gerçek zamanlı)
export const updateCurrentGuess = mutation({
  args: { 
    matchId: v.id("matches"), 
    odaId: v.string(),
    currentGuess: v.string(),
  },
  handler: async (ctx, args) => {
    const playerState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", args.odaId)
      )
      .first();
    
    if (playerState && playerState.gameState === "playing") {
      await ctx.db.patch(playerState._id, {
        currentGuess: args.currentGuess,
      });
    }
  },
});

// Maç sonucunu getir
export const getMatchResult = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;
    
    const playerStates = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .collect();
    
    return {
      match,
      playerStates,
    };
  },
});

// Oyundan ayrıl - oyuncu sekmeyi kapatırsa, geri giderse veya çıkarsa
export const leaveMatch = mutation({
  args: { 
    matchId: v.id("matches"), 
    odaId: v.string(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "playing") {
      return { success: false, error: "Maç aktif değil" };
    }
    
    // Oyuncunun durumunu güncelle
    const playerState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", args.odaId)
      )
      .first();
    
    if (playerState) {
      await ctx.db.patch(playerState._id, {
        gameState: "disconnected",
        finishedAt: Date.now(),
      });
    }
    
    // Rakibin oda ID'sini bul
    const opponentOdaId = match.odaId1 === args.odaId ? match.odaId2 : match.odaId1;
    
    // Maçı abandoned olarak işaretle ve rakibi kazanan yap
    await ctx.db.patch(args.matchId, {
      status: "abandoned",
      abandonedBy: args.odaId,
      winnerId: opponentOdaId,
      finishedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Sallantı jokeri gönder - 30 saniyede bir kullanılabilir
export const sendShake = mutation({
  args: { 
    matchId: v.id("matches"), 
    odaId: v.string(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "playing") {
      return { success: false, error: "Maç aktif değil" };
    }
    
    // Kendi state'imizi al
    const myState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", args.odaId)
      )
      .first();
    
    if (!myState || myState.gameState !== "playing") {
      return { success: false, error: "Oyun durumu geçersiz" };
    }
    
    // 30 saniye bekleme kontrolü
    const now = Date.now();
    const cooldown = 30000; // 30 saniye
    if (myState.lastShakeSentAt && now - myState.lastShakeSentAt < cooldown) {
      const remaining = Math.ceil((cooldown - (now - myState.lastShakeSentAt)) / 1000);
      return { success: false, error: `${remaining} saniye bekle`, cooldownRemaining: remaining };
    }
    
    // Rakibin state'ini al
    const opponentOdaId = match.odaId1 === args.odaId ? match.odaId2 : match.odaId1;
    const opponentState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", opponentOdaId)
      )
      .first();
    
    if (!opponentState) {
      return { success: false, error: "Rakip bulunamadı" };
    }
    
    // Kendi son gönderme zamanını güncelle
    await ctx.db.patch(myState._id, {
      lastShakeSentAt: now,
    });
    
    // Rakibe sallantı gönder
    await ctx.db.patch(opponentState._id, {
      receivedShakeAt: now,
    });
    
    return { success: true };
  },
});

// Sallantıyı temizle (3 saniye sonra client tarafından çağrılır)
export const clearShake = mutation({
  args: { 
    matchId: v.id("matches"), 
    odaId: v.string(),
  },
  handler: async (ctx, args) => {
    const playerState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", args.odaId)
      )
      .first();
    
    if (playerState) {
      await ctx.db.patch(playerState._id, {
        receivedShakeAt: undefined,
      });
    }
  },
});
