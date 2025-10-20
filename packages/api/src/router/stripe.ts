import Stripe from "stripe";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

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
      const paymentIntent = await stripe.paymentIntents.create({
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
  createConnectAccount: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        email: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Create Stripe Connect account
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: input.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          userId: input.userId,
          userName: input.name,
        },
      });

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url:
          process.env.STRIPE_CONNECT_REFRESH_URL || "fanfront://stripe-refresh",
        return_url:
          process.env.STRIPE_CONNECT_RETURN_URL || "fanfront://stripe-return",
        type: "account_onboarding",
      });

      return {
        accountId: account.id,
        onboardingUrl: accountLink.url,
      };
    }),

  // Get existing account onboarding link
  getConnectAccountLink: protectedProcedure
    .input(
      z.object({
        stripeAccountId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const accountLink = await stripe.accountLinks.create({
        account: input.stripeAccountId,
        refresh_url:
          process.env.STRIPE_CONNECT_REFRESH_URL || "fanfront://stripe-refresh",
        return_url:
          process.env.STRIPE_CONNECT_RETURN_URL || "fanfront://stripe-return",
        type: "account_onboarding",
      });

      return {
        onboardingUrl: accountLink.url,
      };
    }),

  // Get Stripe Connect dashboard link
  getDashboardLink: protectedProcedure
    .input(
      z.object({
        stripeAccountId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const loginLink = await stripe.accounts.createLoginLink(
        input.stripeAccountId,
      );

      return {
        dashboardUrl: loginLink.url,
      };
    }),

  // Refresh account status from Stripe
  refreshAccountStatus: protectedProcedure
    .input(
      z.object({
        stripeAccountId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const account = await stripe.accounts.retrieve(input.stripeAccountId);

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
      const paymentIntent = await stripe.paymentIntents.retrieve(
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
      const refund = await stripe.refunds.create({
        payment_intent: input.paymentIntentId,
      });

      return {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
      };
    }),
});
