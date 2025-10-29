import type { TRPCRouterRecord } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

import { CreateEventSchema, event } from "@acme/db/schema";

import { protectedProcedure } from "../trpc";

// Helper function to generate a unique 6-character event code
function generateEventCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const eventRouter = {
  // Create a new event
  create: protectedProcedure
    .input(CreateEventSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Generate unique event code
      let eventCode = generateEventCode();
      let existingEvent = await ctx.db
        .select()
        .from(event)
        .where(eq(event.eventCode, eventCode))
        .limit(1);

      // Regenerate if code already exists
      while (existingEvent.length > 0) {
        eventCode = generateEventCode();
        existingEvent = await ctx.db
          .select()
          .from(event)
          .where(eq(event.eventCode, eventCode))
          .limit(1);
      }

      const newEvent = await ctx.db
        .insert(event)
        .values({
          ...input,
          celebrityId: userId, // Use authenticated user's ID
          eventCode,
        })
        .returning();

      console.log("[createEvent] Created event:", newEvent[0]);

      return newEvent[0];
    }),

  // Get all events by a celebrity
  getByCelebrity: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const events = await ctx.db
      .select()
      .from(event)
      .where(eq(event.celebrityId, userId))
      .orderBy(event.createdAt);

    return events;
  }),

  // Get event by ID
  getById: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const eventData = await ctx.db
        .select()
        .from(event)
        .where(eq(event.id, input.eventId))
        .limit(1);

      return eventData[0] ?? null;
    }),

  // Get event by code (for fans scanning QR codes)
  getByCode: protectedProcedure
    .input(z.object({ eventCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const eventData = await ctx.db
        .select()
        .from(event)
        .where(eq(event.eventCode, input.eventCode.toUpperCase()))
        .limit(1);

      return eventData[0] ?? null;
    }),

  // Update event (toggle active status, etc.)
  update: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify ownership
      const existingEvent = await ctx.db
        .select()
        .from(event)
        .where(eq(event.id, input.eventId))
        .limit(1);

      if (!existingEvent[0] || existingEvent[0].celebrityId !== userId) {
        throw new Error("Event not found or unauthorized");
      }

      const { eventId, ...updates } = input;

      const updatedEvent = await ctx.db
        .update(event)
        .set(updates)
        .where(eq(event.id, eventId))
        .returning();

      return updatedEvent[0];
    }),

  // Delete event
  delete: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify ownership
      const existingEvent = await ctx.db
        .select()
        .from(event)
        .where(eq(event.id, input.eventId))
        .limit(1);

      if (!existingEvent[0] || existingEvent[0].celebrityId !== userId) {
        throw new Error("Event not found or unauthorized");
      }

      await ctx.db.delete(event).where(eq(event.id, input.eventId));

      return { success: true };
    }),
} satisfies TRPCRouterRecord;
