import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

// Join a queue
export const joinQueue = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
    paymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if event exists and is active
    const event = await ctx.db.get(args.eventId);
    if (!event || !event.isActive) {
      throw new Error("Event not found or not active");
    }

    // Check if payment is required
    if (event.price && event.price > 0) {
      if (!args.paymentIntentId) {
        throw new Error("Payment is required for this event");
      }
    }

    // Check if user is already in queue
    const existingEntry = await ctx.db
      .query("queueEntries")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .filter((q) => q.neq(q.field("status"), "completed"))
      .first();

    if (existingEntry) {
      throw new Error("You are already in this queue");
    }

    // Get current queue size
    const currentQueue = await ctx.db
      .query("queueEntries")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    // Check capacity
    if (currentQueue.length >= event.maxCapacity) {
      throw new Error("Queue is full");
    }

    // Calculate position and estimated time
    const position = currentQueue.length + 1;
    const now = Date.now();

    // Calculate estimated time considering physical line threshold and slot duration
    const totalMinutesAhead =
      (position - 1 + event.physicalLineThreshold) * event.slotDuration;
    const estimatedTime = event.startTime + totalMinutesAhead * 60 * 1000; // Convert to milliseconds

    // Determine initial payment status
    // Payment starts as "pending" and will be updated by webhook to "succeeded" or "failed"
    const initialPaymentStatus = args.paymentIntentId ? "pending" : undefined;

    // Create queue entry
    const queueEntryId = await ctx.db.insert("queueEntries", {
      eventId: args.eventId,
      userId: args.userId,
      position,
      estimatedTime,
      status: "waiting",
      paymentIntentId: args.paymentIntentId,
      paymentStatus: initialPaymentStatus,
      amountPaid: event.price,
      joinedAt: now,
      notificationsSent: [],
    });

    // Create notification
    await ctx.db.insert("notifications", {
      userId: args.userId,
      eventId: args.eventId,
      queueEntryId,
      type: "queue_joined",
      message: `You've joined the queue for ${event.title}. You are #${position} in line.`,
      isRead: false,
      createdAt: now,
    });

    return queueEntryId;
  },
});

// Get user's queue entries
export const getUserQueueEntries = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("queueEntries")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    // Get event details for each entry
    const entriesWithEvents = await Promise.all(
      entries.map(async (entry) => {
        const event = await ctx.db.get(entry.eventId);
        const celebrity = event ? await ctx.db.get(event.celebrityId) : null;

        return {
          ...entry,
          event,
          celebrity,
        };
      }),
    );

    return entriesWithEvents;
  },
});

// Get queue for an event
export const getEventQueue = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("queueEntries")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    // Sort by position
    entries.sort((a, b) => a.position - b.position);

    // Get user details for each entry
    const entriesWithUsers = await Promise.all(
      entries.map(async (entry) => {
        const user = await ctx.db.get(entry.userId);
        return {
          ...entry,
          user,
        };
      }),
    );

    return entriesWithUsers;
  },
});

// Update queue positions (called when someone leaves or is served)
export const updateQueuePositions = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return;

    // Get all active queue entries
    const entries = await ctx.db
      .query("queueEntries")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("status"), "waiting"))
      .collect();

    // Sort by current position
    entries.sort((a, b) => a.position - b.position);

    // Update positions and estimated times
    const now = Date.now();
    for (let i = 0; i < entries.length; i++) {
      const newPosition = i + 1;
      const totalMinutesAhead =
        (newPosition - 1 + event.physicalLineThreshold) * event.slotDuration;
      const estimatedTime = event.startTime + totalMinutesAhead * 60 * 1000;

      if (entries[i].position !== newPosition) {
        await ctx.db.patch(entries[i]._id, {
          position: newPosition,
          estimatedTime,
        });

        // Create position update notification if position improved significantly
        if (entries[i].position - newPosition >= 3) {
          await ctx.db.insert("notifications", {
            userId: entries[i].userId,
            eventId: args.eventId,
            queueEntryId: entries[i]._id,
            type: "position_update",
            message: `Your position has been updated! You are now #${newPosition} in line.`,
            isRead: false,
            createdAt: now,
          });
        }
      }
    }
  },
});

// Cancel queue entry
export const cancelQueueEntry = mutation({
  args: {
    queueEntryId: v.id("queueEntries"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.queueEntryId);
    if (!entry) {
      throw new Error("Queue entry not found");
    }

    // Verify ownership
    if (entry.userId !== args.userId) {
      throw new Error("You can only cancel your own queue entries");
    }

    // Update status
    await ctx.db.patch(args.queueEntryId, {
      status: "cancelled",
    });

    // Update positions for remaining entries
    await updateQueuePositions(ctx, { eventId: entry.eventId });

    return args.queueEntryId;
  },
});

// Mark entry as called (for celebrities)
export const callNextInQueue = mutation({
  args: {
    eventId: v.id("events"),
    celebrityId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.celebrityId !== args.celebrityId) {
      throw new Error("Event not found or unauthorized");
    }

    // Find next person in queue
    const nextEntry = await ctx.db
      .query("queueEntries")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("status"), "waiting"))
      .order("asc")
      .first();

    if (!nextEntry) {
      throw new Error("No one in queue");
    }

    const now = Date.now();

    // Update entry status
    await ctx.db.patch(nextEntry._id, {
      status: "called",
      calledAt: now,
    });

    // Create notification
    await ctx.db.insert("notifications", {
      userId: nextEntry.userId,
      eventId: args.eventId,
      queueEntryId: nextEntry._id,
      type: "your_turn",
      message: `It's your turn! Please come to the ${event.location}.`,
      isRead: false,
      createdAt: now,
    });

    return nextEntry._id;
  },
});

// Mark entry as completed
export const completeQueueEntry = mutation({
  args: {
    queueEntryId: v.id("queueEntries"),
    celebrityId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.queueEntryId);
    if (!entry) {
      throw new Error("Queue entry not found");
    }

    const event = await ctx.db.get(entry.eventId);
    if (!event || event.celebrityId !== args.celebrityId) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();

    // Update entry status
    await ctx.db.patch(args.queueEntryId, {
      status: "completed",
      completedAt: now,
    });

    // Update positions for remaining entries
    await updateQueuePositions(ctx, { eventId: entry.eventId });

    return args.queueEntryId;
  },
});
