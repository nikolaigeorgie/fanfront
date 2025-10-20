import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

// Join queue - called from client after payment/event join
export const joinQueue = mutation({
  args: {
    eventId: v.string(), // External event ID
    userId: v.string(), // External user ID
    eventStartTime: v.number(), // Event start time from main DB
    slotDuration: v.number(), // Time per person in minutes
    physicalLineThreshold: v.number(), // Physical line count
  },
  handler: async (ctx, args) => {
    // Check if user already in queue
    const existing = await ctx.db
      .query("queuePositions")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", args.eventId).eq("status", "waiting"),
      )
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) {
      throw new Error("Already in queue");
    }

    // Get current queue size
    const queueCount = await ctx.db
      .query("queuePositions")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", args.eventId).eq("status", "waiting"),
      )
      .collect();

    const position = queueCount.length + 1;
    const now = Date.now();

    // Calculate estimated time
    const totalMinutesAhead =
      (position - 1 + args.physicalLineThreshold) * args.slotDuration;
    const estimatedTime = args.eventStartTime + totalMinutesAhead * 60 * 1000;

    // Create queue position
    const id = await ctx.db.insert("queuePositions", {
      eventId: args.eventId,
      userId: args.userId,
      position,
      estimatedTime,
      status: "waiting",
      joinedAt: now,
    });

    // Create notification event
    await ctx.db.insert("webhookEvents", {
      type: "queue.position.updated",
      userId: args.userId,
      eventId: args.eventId,
      data: {
        position,
        estimatedTime,
        message: `You've joined the queue. You are #${position} in line.`,
      },
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
    });

    return id;
  },
});

// Get user's current queue positions (real-time)
export const getUserQueue = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("queuePositions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .filter((q) => q.neq(q.field("status"), "completed"))
      .collect();
  },
});

// Get event queue (real-time) - for creator dashboard
export const getEventQueue = query({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    const positions = await ctx.db
      .query("queuePositions")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    return positions.sort((a, b) => a.position - b.position);
  },
});

// Update queue positions after someone leaves
export const updateQueuePositions = mutation({
  args: {
    eventId: v.string(),
    eventStartTime: v.number(),
    slotDuration: v.number(),
    physicalLineThreshold: v.number(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("queuePositions")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", args.eventId).eq("status", "waiting"),
      )
      .collect();

    // Sort by current position
    entries.sort((a, b) => a.position - b.position);

    const now = Date.now();

    // Recalculate positions
    for (let i = 0; i < entries.length; i++) {
      const newPosition = i + 1;
      const totalMinutesAhead =
        (newPosition - 1 + args.physicalLineThreshold) * args.slotDuration;
      const estimatedTime = args.eventStartTime + totalMinutesAhead * 60 * 1000;

      if (entries[i].position !== newPosition) {
        await ctx.db.patch(entries[i]._id, {
          position: newPosition,
          estimatedTime,
        });

        // Notify user of position change
        await ctx.db.insert("webhookEvents", {
          type: "queue.position.updated",
          userId: entries[i].userId,
          eventId: args.eventId,
          data: {
            position: newPosition,
            estimatedTime,
            message: `Your position updated! You are now #${newPosition} in line.`,
          },
          createdAt: now,
          expiresAt: now + 24 * 60 * 60 * 1000,
        });
      }
    }
  },
});

// Call next person in queue
export const callNext = mutation({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    // Find first person waiting
    const next = await ctx.db
      .query("queuePositions")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", args.eventId).eq("status", "waiting"),
      )
      .order("asc")
      .first();

    if (!next) {
      throw new Error("No one waiting in queue");
    }

    const now = Date.now();

    await ctx.db.patch(next._id, {
      status: "called",
      calledAt: now,
    });

    // Notify user it's their turn
    await ctx.db.insert("webhookEvents", {
      type: "queue.your_turn",
      userId: next.userId,
      eventId: args.eventId,
      data: {
        position: next.position,
        message: "It's your turn! Head to the front now.",
      },
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });

    return next._id;
  },
});

// Complete a queue entry
export const completeEntry = mutation({
  args: { queuePositionId: v.id("queuePositions") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.queuePositionId);
    if (!entry) throw new Error("Queue position not found");

    await ctx.db.patch(args.queuePositionId, {
      status: "completed",
    });

    // Update remaining positions
    await ctx.scheduler.runAfter(0, "queue:updateQueuePositions", {
      eventId: entry.eventId,
      eventStartTime: entry.estimatedTime, // Approximate
      slotDuration: 10, // Default
      physicalLineThreshold: 0,
    });

    return args.queuePositionId;
  },
});

// Cancel queue entry
export const cancelEntry = mutation({
  args: {
    queuePositionId: v.id("queuePositions"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.queuePositionId);
    if (!entry) throw new Error("Queue position not found");

    // Verify ownership
    if (entry.userId !== args.userId) {
      throw new Error("Can only cancel your own queue position");
    }

    await ctx.db.patch(args.queuePositionId, {
      status: "cancelled",
    });

    return args.queuePositionId;
  },
});
