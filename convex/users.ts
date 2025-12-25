import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Kullanıcı adının kullanılabilir olup olmadığını kontrol et
export const checkUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    // Case-insensitive kontrol için lowercase ile karşılaştır
    const allUsers = await ctx.db.query("users").collect();
    const exists = allUsers.some(
      (u) => u.username.toLowerCase() === args.username.toLowerCase()
    );
    
    return !exists;
  },
});

// Cihaz ID'sine göre kullanıcı bul
export const getUserByDeviceId = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();
    
    return user;
  },
});

// Yeni kullanıcı kaydet
export const registerUser = mutation({
  args: { 
    username: v.string(),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmedUsername = args.username.trim();
    
    // Kullanıcı adı kullanılıyor mu kontrol et (case-insensitive)
    const allUsers = await ctx.db.query("users").collect();
    const exists = allUsers.some(
      (u) => u.username.toLowerCase() === trimmedUsername.toLowerCase()
    );
    
    if (exists) {
      return { success: false, error: "Bu kullanıcı adı zaten kullanılıyor" };
    }
    
    // Bu cihazda zaten kullanıcı var mı kontrol et
    const existingDevice = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();
    
    if (existingDevice) {
      return { success: false, error: "Bu cihazda zaten bir hesap var" };
    }
    
    // Yeni kullanıcı oluştur - olduğu gibi sakla
    const userId = await ctx.db.insert("users", {
      username: trimmedUsername,
      deviceId: args.deviceId,
      createdAt: Date.now(),
    });
    
    return { success: true, userId, username: trimmedUsername };
  },
});
