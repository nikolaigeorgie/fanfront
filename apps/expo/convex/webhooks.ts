import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

// Emit webhook event (called from Next.js API when Stripe webhook received)
export const emitWebhookEvent = mutation({
  args: {
    type: v.union(
      v.literal("stripe.account.updated"),
      v.literal("stripe.payment.succeeded"),
      v.literal("stripe.payment.failed"),
      v.literal("queue.position.updated"),
      v.literal("queue.your_turn"),
    ),
    userId: v.optional(v.string()),
    eventId: v.optional(v.string()),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const id = await ctx.db.insert("webhookEvents", {
      type: args.type,
      userId: args.userId,
      eventId: args.eventId,
      data: args.data,
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000, // Expire after 24 hours
    });

    console.log(`[Convex] Webhook event emitted: ${args.type}`, id);

    return id;
  },
});

// Get webhook events for a user (client subscribes to this)
export const getUserWebhookEvents = query({
  args: {
    userId: v.string(),
    since: v.optional(v.number()), // Timestamp to get events since
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("webhookEvents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    let events = await query.collect();

    // Filter by timestamp if provided
    if (args.since) {
      events = events.filter((e) => e.createdAt > args.since);
    }

    // Sort by newest first
    return events.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Clean up expired webhook events (called by cron)
export const cleanupExpiredEvents = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expired = await ctx.db
      .query("webhookEvents")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();

    for (const event of expired) {
      await ctx.db.delete(event._id);
    }

    console.log(`[Convex] Cleaned up ${expired.length} expired webhook events`);

    return expired.length;
  },
});
