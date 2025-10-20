import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Real-time queue positions (ephemeral - references external DB)
  queuePositions: defineTable({
    eventId: v.string(), // External event ID from main DB
    userId: v.string(), // External user ID from main DB
    position: v.number(),
    estimatedTime: v.number(), // Unix timestamp
    status: v.union(
      v.literal("waiting"),
      v.literal("called"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    joinedAt: v.number(),
    calledAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_event_status", ["eventId", "status"]),

  // Real-time webhook notifications (ephemeral - for live updates)
  webhookEvents: defineTable({
    type: v.union(
      v.literal("stripe.account.updated"),
      v.literal("stripe.payment.succeeded"),
      v.literal("stripe.payment.failed"),
      v.literal("queue.position.updated"),
      v.literal("queue.your_turn"),
    ),
    userId: v.optional(v.string()), // Who this event is for
    eventId: v.optional(v.string()), // Related event if applicable
    data: v.any(), // Event payload
    createdAt: v.number(),
    expiresAt: v.number(), // Auto-cleanup after 24 hours
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"])
    .index("by_expires", ["expiresAt"]),
});
