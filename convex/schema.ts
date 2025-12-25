import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Match queue - bekleyen oyuncular
  matchQueue: defineTable({
    odaId: v.string(), // Rastgele oda kimliği
    status: v.union(v.literal("waiting"), v.literal("matched"), v.literal("cancelled")),
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  // Active matches - aktif maçlar
  matches: defineTable({
    odaId1: v.string(), // Birinci oyuncunun oda ID'si
    odaId2: v.string(), // İkinci oyuncunun oda ID'si
    targetWord: v.string(), // Hedef kelime
    status: v.union(v.literal("playing"), v.literal("finished")),
    winnerId: v.optional(v.string()), // Kazananın oda ID'si
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
  })
    .index("by_odaId1", ["odaId1"])
    .index("by_odaId2", ["odaId2"])
    .index("by_status", ["status"]),

  // Player game states - oyuncu oyun durumları
  playerStates: defineTable({
    matchId: v.id("matches"),
    odaId: v.string(),
    guesses: v.array(
      v.array(
        v.object({
          letter: v.string(),
          state: v.union(
            v.literal("correct"),
            v.literal("present"),
            v.literal("absent"),
            v.literal("empty")
          ),
        })
      )
    ),
    currentGuess: v.string(),
    gameState: v.union(v.literal("playing"), v.literal("won"), v.literal("lost")),
    finishedAt: v.optional(v.number()),
  })
    .index("by_matchId", ["matchId"])
    .index("by_odaId", ["odaId"])
    .index("by_matchId_odaId", ["matchId", "odaId"]),
});
