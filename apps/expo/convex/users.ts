import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create or update user profile
export const createOrUpdateUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    userType: v.union(v.literal("fan"), v.literal("celebrity")),
    authUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    const now = Date.now();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        name: args.name,
        userType: args.userType,
        authUserId: args.authUserId,
        updatedAt: now,
      });
      return existingUser._id;
    } else {
      // Create new user
      return await ctx.db.insert("users", {
        email: args.email,
        name: args.name,
        userType: args.userType,
        authUserId: args.authUserId,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Get user by auth user ID
export const getUserByAuthId = query({
  args: { authUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", args.authUserId))
      .first();
  },
});

// Get user by ID
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Get all celebrities
export const getCelebrities = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userType"), "celebrity"))
      .collect();
  },
});
