import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { z } from "zod";

import { user } from "@acme/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";

// Lazy-load Stripe instance to avoid build-time initialization
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not defined");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

export const stripeRouter = createTRPCRouter({
  // Create payment intent for queue entry
  createPaymentIntent: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        userId: z.string(),
        amount: z.number(),
        celebrityStripeAccountId: z.string(),
        eventTitle: z.string(),
        celebrityId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Calculate platform fee (10%)
      const platformFee = Math.floor(input.amount * 0.1);

      // Create payment intent with destination charge
      const paymentIntent = await getStripe().paymentIntents.create({
        amount: input.amount,
        currency: "usd",
        application_fee_amount: platformFee,
        transfer_data: {
          destination: input.celebrityStripeAccountId,
        },
        metadata: {
          eventId: input.eventId,
          userId: input.userId,
          celebrityId: input.celebrityId,
          eventTitle: input.eventTitle,
          celebrityStripeAccountId: input.celebrityStripeAccountId,
        },
        description: `Queue entry for ${input.eventTitle}`,
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    }),

  // Create Stripe Connect account and onboarding link
  createConnectAccount: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const userId = ctx.session.user.id;

      console.log(
        "[Stripe API] Creating Stripe Connect account for user:",
        userId,
      );

      // Get user data from database
      const existingUser = await ctx.db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (!existingUser[0]) {
        throw new Error("User not found in database");
      }

      const userData = existingUser[0];
      console.log("[Stripe API] User data:", {
        id: userData.id,
        email: userData.email,
        hasStripeAccount: !!userData.stripeAccountId,
      });

      if (userData.stripeAccountId) {
        console.log(
          "[Stripe API] User already has Stripe account:",
          userData.stripeAccountId,
        );
        // Return existing account with new onboarding link
        const accountLink = await getStripe().accountLinks.create({
          account: userData.stripeAccountId,
          refresh_url: "https://fanfront.com/redirect",
          return_url: "https://fanfront.com/redirect",
          type: "account_onboarding",
        });

        console.log("[Stripe API] Generated onboarding link");

        return {
          accountId: userData.stripeAccountId,
          onboardingUrl: accountLink.url,
        };
      }

      // Create new Stripe Connect account
      console.log("[Stripe API] Creating new Stripe Express account");
      const account = await getStripe().accounts.create({
        type: "express",
        country: "US",
        email: userData.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          userId: userId,
          userName: userData.name,
        },
      });

      console.log("[Stripe API] Created Stripe account:", account.id);

      // Save Stripe account ID to database
      await ctx.db
        .update(user)
        .set({
          stripeAccountId: account.id,
          stripeAccountStatus: "pending",
          stripeOnboardingComplete: false,
        })
        .where(eq(user.id, userId));

      console.log("[Stripe API] Saved account to database");

      // Create account link for onboarding
      const accountLink = await getStripe().accountLinks.create({
        account: account.id,
        refresh_url: "https://fanfront.com/redirect",
        return_url: "https://fanfront.com/redirect",
        type: "account_onboarding",
      });

      console.log("[Stripe API] Generated onboarding link:", accountLink.url);

      return {
        accountId: account.id,
        onboardingUrl: accountLink.url,
      };
    } catch (error: any) {
      console.error("[Stripe API] Error creating connect account:", error);
      throw new Error(
        `Failed to create Stripe Connect account: ${error.message}`,
      );
    }
  }),

  // Get existing account onboarding link
  getConnectAccountLink: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const currentUser = await ctx.db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!currentUser[0]?.stripeAccountId) {
      throw new Error("No Stripe account found");
    }

    const accountLink = await getStripe().accountLinks.create({
      account: currentUser[0].stripeAccountId,
      refresh_url: "https://fanfront.com/redirect",
      return_url: "https://fanfront.com/redirect",
      type: "account_onboarding",
    });

    return {
      onboardingUrl: accountLink.url,
    };
  }),

  // Get Stripe Connect dashboard link
  getDashboardLink: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const currentUser = await ctx.db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!currentUser[0]?.stripeAccountId) {
      throw new Error("No Stripe account found");
    }

    const loginLink = await getStripe().accounts.createLoginLink(
      currentUser[0].stripeAccountId,
    );

    return {
      dashboardUrl: loginLink.url,
    };
  }),

  // Refresh account status from Stripe
  refreshAccountStatus: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get user's Stripe account ID
    const currentUser = await ctx.db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!currentUser[0]?.stripeAccountId) {
      throw new Error("No Stripe account found");
    }

    const account = await getStripe().accounts.retrieve(
      currentUser[0].stripeAccountId,
    );

    // Determine status
    let status: "pending" | "restricted" | "active" | "rejected" = "pending";
    if (account.charges_enabled && account.payouts_enabled) {
      status = "active";
    } else if (account.requirements?.disabled_reason) {
      status = "rejected";
    } else if (
      account.requirements?.currently_due &&
      account.requirements.currently_due.length > 0
    ) {
      status = "restricted";
    }

    // Update database with latest status
    await ctx.db
      .update(user)
      .set({
        stripeAccountStatus: status,
        stripeOnboardingComplete: account.details_submitted || false,
        stripeChargesEnabled: account.charges_enabled || false,
        stripePayoutsEnabled: account.payouts_enabled || false,
      })
      .where(eq(user.id, userId));

    return {
      status,
      onboardingComplete: account.details_submitted || false,
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
    };
  }),

  // Verify payment status
  verifyPayment: protectedProcedure
    .input(
      z.object({
        paymentIntentId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const paymentIntent = await getStripe().paymentIntents.retrieve(
        input.paymentIntentId,
      );

      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount,
      };
    }),

  // Refund payment
  refundPayment: protectedProcedure
    .input(
      z.object({
        paymentIntentId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const refund = await getStripe().refunds.create({
        payment_intent: input.paymentIntentId,
      });

      return {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
      };
    }),
});
