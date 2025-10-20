import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

// Generate a unique event code
function generateEventCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create a new event (celebrities only)
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    celebrityId: v.id("users"),
    location: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    maxDuration: v.number(), // in minutes
    slotDuration: v.number(), // in minutes
    maxCapacity: v.optional(v.number()),
    physicalLineThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify the user is a celebrity
    const celebrity = await ctx.db.get(args.celebrityId);
    if (!celebrity || celebrity.userType !== "celebrity") {
      throw new Error("Only celebrities can create events");
    }

    // Generate unique event code
    let eventCode: string;
    let isUnique = false;
    do {
      eventCode = generateEventCode();
      const existing = await ctx.db
        .query("events")
        .withIndex("by_event_code", (q) => q.eq("eventCode", eventCode))
        .first();
      isUnique = !existing;
    } while (!isUnique);

    const now = Date.now();
    const maxCapacity =
      args.maxCapacity || Math.floor(args.maxDuration / args.slotDuration);

    return await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      celebrityId: args.celebrityId,
      eventCode: eventCode!,
      location: args.location,
      startTime: args.startTime,
      endTime: args.endTime,
      maxDuration: args.maxDuration,
      slotDuration: args.slotDuration,
      maxCapacity,
      physicalLineThreshold: args.physicalLineThreshold || 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get event by ID
export const getEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    // Get celebrity info
    const celebrity = await ctx.db.get(event.celebrityId);

    // Get current queue count
    const queueCount = await ctx.db
      .query("queueEntries")
      .withIndex("by_event", (q) => q.eq("eventId", event._id))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    return {
      ...event,
      celebrity,
      currentQueueCount: queueCount.length,
      availableSlots: event.maxCapacity - queueCount.length,
    };
  },
});

// Get event by code (for QR scanning)
export const getEventByCode = query({
  args: { eventCode: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_event_code", (q) => q.eq("eventCode", args.eventCode))
      .first();

    if (!event) return null;

    // Get celebrity info
    const celebrity = await ctx.db.get(event.celebrityId);

    // Get current queue count
    const queueCount = await ctx.db
      .query("queueEntries")
      .withIndex("by_event", (q) => q.eq("eventId", event._id))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    return {
      ...event,
      celebrity,
      currentQueueCount: queueCount.length,
      availableSlots: event.maxCapacity - queueCount.length,
    };
  },
});

// Get events by celebrity
export const getEventsByCelebrity = query({
  args: { celebrityId: v.id("users") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_celebrity", (q) => q.eq("celebrityId", args.celebrityId))
      .collect();

    // Get queue counts for each event
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const queueCount = await ctx.db
          .query("queueEntries")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .filter((q) => q.neq(q.field("status"), "cancelled"))
          .collect();

        return {
          ...event,
          currentQueueCount: queueCount.length,
          availableSlots: event.maxCapacity - queueCount.length,
        };
      }),
    );

    return eventsWithCounts;
  },
});

// Get active events
export const getActiveEvents = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Get celebrity info and queue counts
    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const celebrity = await ctx.db.get(event.celebrityId);
        const queueCount = await ctx.db
          .query("queueEntries")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .filter((q) => q.neq(q.field("status"), "cancelled"))
          .collect();

        return {
          ...event,
          celebrity,
          currentQueueCount: queueCount.length,
          availableSlots: event.maxCapacity - queueCount.length,
        };
      }),
    );

    return eventsWithDetails;
  },
});

// Update event
export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    celebrityId: v.id("users"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    maxDuration: v.optional(v.number()),
    slotDuration: v.optional(v.number()),
    maxCapacity: v.optional(v.number()),
    physicalLineThreshold: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Verify ownership
    if (event.celebrityId !== args.celebrityId) {
      throw new Error("You can only update your own events");
    }

    const updateData: any = { updatedAt: Date.now() };

    // Only update provided fields
    if (args.title !== undefined) updateData.title = args.title;
    if (args.description !== undefined)
      updateData.description = args.description;
    if (args.location !== undefined) updateData.location = args.location;
    if (args.startTime !== undefined) updateData.startTime = args.startTime;
    if (args.endTime !== undefined) updateData.endTime = args.endTime;
    if (args.maxDuration !== undefined)
      updateData.maxDuration = args.maxDuration;
    if (args.slotDuration !== undefined)
      updateData.slotDuration = args.slotDuration;
    if (args.maxCapacity !== undefined)
      updateData.maxCapacity = args.maxCapacity;
    if (args.physicalLineThreshold !== undefined)
      updateData.physicalLineThreshold = args.physicalLineThreshold;
    if (args.isActive !== undefined) updateData.isActive = args.isActive;

    await ctx.db.patch(args.eventId, updateData);
    return args.eventId;
  },
});
