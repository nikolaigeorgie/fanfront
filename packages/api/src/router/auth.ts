import type { TRPCRouterRecord } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

import { user } from "@acme/db/schema";

import { protectedProcedure, publicProcedure } from "../trpc";

export const authRouter = {
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    console.log("[getCurrentUser] Fetching user:", userId);

    const currentUser = await ctx.db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    console.log("[getCurrentUser] Found user:", currentUser[0]);

    return currentUser[0] ?? null;
  }),
  updateUserType: protectedProcedure
    .input(z.object({ userType: z.enum(["fan", "celebrity"]) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      console.log(
        "[updateUserType] Updating user:",
        userId,
        "to type:",
        input.userType,
      );

      const result = await ctx.db
        .update(user)
        .set({ userType: input.userType })
        .where(eq(user.id, userId))
        .returning();

      console.log("[updateUserType] Update result:", result);

      return { success: true, updatedUser: result[0] };
    }),
  getSecretMessage: protectedProcedure.query(() => {
    return "you can see this secret message!";
  }),
  canCreateEvents: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const currentUser = await ctx.db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    // User can create events if they have completed Stripe onboarding
    return (
      currentUser[0]?.stripeOnboardingComplete === true &&
      currentUser[0]?.stripeAccountStatus === "active"
    );
  }),
} satisfies TRPCRouterRecord;
