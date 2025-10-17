import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - extends the auth users with user type
  users: defineTable({
    email: v.string(),
    name: v.string(),
    userType: v.union(v.literal("fan"), v.literal("celebrity")), // fan or celebrity
    authUserId: v.optional(v.string()), // Reference to auth system user ID
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]).index("by_auth_user_id", ["authUserId"]),

  // Events created by celebrities
  events: defineTable({
    title: v.string(),
    description: v.string(),
    celebrityId: v.id("users"), // Reference to celebrity user
    eventCode: v.string(), // Unique code for QR/manual entry
    location: v.string(),
    startTime: v.number(), // Unix timestamp
    endTime: v.number(), // Unix timestamp
    maxDuration: v.number(), // Total event duration in minutes
    slotDuration: v.number(), // Time per person in minutes (e.g., 10 minutes)
    maxCapacity: v.number(), // Maximum people in queue
    physicalLineThreshold: v.number(), // Number of people in physical line to account for
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_celebrity", ["celebrityId"])
    .index("by_event_code", ["eventCode"])
    .index("by_active", ["isActive"]),

  // Queue entries for each event
  queueEntries: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    position: v.number(), // Position in queue (1-based)
    estimatedTime: v.number(), // Estimated time when they'll be called (Unix timestamp)
    status: v.union(
      v.literal("waiting"), 
      v.literal("called"), 
      v.literal("completed"), 
      v.literal("missed"),
      v.literal("cancelled")
    ),
    joinedAt: v.number(),
    calledAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    notificationsSent: v.array(v.string()), // Track which notifications were sent
  }).index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_event_position", ["eventId", "position"])
    .index("by_status", ["status"]),

  // Notifications for queue updates
  notifications: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
    queueEntryId: v.id("queueEntries"),
    type: v.union(
      v.literal("queue_joined"),
      v.literal("position_update"),
      v.literal("coming_up"), // 15 minutes before
      v.literal("next_up"), // 5 minutes before
      v.literal("your_turn"),
      v.literal("missed_turn")
    ),
    message: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_event", ["eventId"]),
});
