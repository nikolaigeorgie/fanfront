import { v } from "convex/values";

import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";

// Create Stripe Connect account link for onboarding
export const createAccountLink = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    // Get user
    const user = await ctx.runQuery(api.users.getUser, { userId: args.userId });
    if (!user) {
      throw new Error("User not found");
    }

    if (user.userType !== "celebrity") {
      throw new Error("Only creators can create Stripe Connect accounts");
    }

    let accountId = user.stripeAccountId;

    // Create Stripe Connect account if doesn't exist
    if (!accountId) {
      const createResponse = await fetch("https://api.stripe.com/v1/accounts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          type: "express",
          country: "US",
          "capabilities[card_payments][requested]": "true",
          "capabilities[transfers][requested]": "true",
          email: user.email,
          "metadata[userId]": args.userId,
          "metadata[userName]": user.name,
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        console.error("Stripe account creation error:", error);
        throw new Error("Failed to create Stripe Connect account");
      }

      const account = await createResponse.json();
      accountId = account.id;

      // Save account ID to user
      await ctx.runMutation(api.stripeConnect.updateStripeAccount, {
        userId: args.userId,
        stripeAccountId: accountId,
        stripeAccountStatus: "pending",
        stripeOnboardingComplete: false,
      });
    }

    // Create account link for onboarding
    const linkResponse = await fetch(
      "https://api.stripe.com/v1/account_links",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          account: accountId,
          refresh_url:
            process.env.STRIPE_CONNECT_REFRESH_URL ||
            "fanfront://stripe-refresh",
          return_url:
            process.env.STRIPE_CONNECT_RETURN_URL || "fanfront://stripe-return",
          type: "account_onboarding",
        }),
      },
    );

    if (!linkResponse.ok) {
      const error = await linkResponse.text();
      console.error("Stripe account link error:", error);
      throw new Error("Failed to create account link");
    }

    const link = await linkResponse.json();

    return { url: link.url };
  },
});

// Get Stripe Connect dashboard link
export const getDashboardLink = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const user = await ctx.runQuery(api.users.getUser, { userId: args.userId });
    if (!user?.stripeAccountId) {
      throw new Error("No Stripe account found");
    }

    // Create login link for dashboard
    const response = await fetch(
      `https://api.stripe.com/v1/accounts/${user.stripeAccountId}/login_links`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to create dashboard link");
    }

    const link = await response.json();

    return { url: link.url };
  },
});

// Refresh account status from Stripe
export const refreshAccountStatus = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const user = await ctx.runQuery(api.users.getUser, { userId: args.userId });
    if (!user?.stripeAccountId) {
      throw new Error("No Stripe account found");
    }

    // Retrieve account from Stripe
    const response = await fetch(
      `https://api.stripe.com/v1/accounts/${user.stripeAccountId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to retrieve account");
    }

    const account = await response.json();

    // Determine status
    let status: "pending" | "restricted" | "active" | "rejected" = "pending";
    if (account.charges_enabled && account.payouts_enabled) {
      status = "active";
    } else if (account.requirements?.disabled_reason) {
      status = "rejected";
    } else if (account.requirements?.currently_due?.length > 0) {
      status = "restricted";
    }

    // Update user
    await ctx.runMutation(api.stripeConnect.updateStripeAccount, {
      userId: args.userId,
      stripeAccountStatus: status,
      stripeOnboardingComplete: account.details_submitted,
      stripeChargesEnabled: account.charges_enabled,
      stripePayoutsEnabled: account.payouts_enabled,
    });

    return {
      status,
      onboardingComplete: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    };
  },
});

// Update Stripe account info (called by mutations)
export const updateStripeAccount = mutation({
  args: {
    userId: v.id("users"),
    stripeAccountId: v.optional(v.string()),
    stripeAccountStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("restricted"),
        v.literal("active"),
        v.literal("rejected"),
      ),
    ),
    stripeOnboardingComplete: v.optional(v.boolean()),
    stripeChargesEnabled: v.optional(v.boolean()),
    stripePayoutsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const updateData: any = { updatedAt: Date.now() };

    if (args.stripeAccountId !== undefined)
      updateData.stripeAccountId = args.stripeAccountId;
    if (args.stripeAccountStatus !== undefined)
      updateData.stripeAccountStatus = args.stripeAccountStatus;
    if (args.stripeOnboardingComplete !== undefined)
      updateData.stripeOnboardingComplete = args.stripeOnboardingComplete;
    if (args.stripeChargesEnabled !== undefined)
      updateData.stripeChargesEnabled = args.stripeChargesEnabled;
    if (args.stripePayoutsEnabled !== undefined)
      updateData.stripePayoutsEnabled = args.stripePayoutsEnabled;

    await ctx.db.patch(args.userId, updateData);

    return args.userId;
  },
});

// Check if user can create events (has completed onboarding)
export const canCreateEvents = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<boolean> => {
    const user = await ctx.db.get(args.userId);
    if (!user) return false;

    // Fans can always create events (they don't receive payments)
    if (user.userType === "fan") return true;

    // Celebrities need active Stripe account
    return (
      user.stripeAccountStatus === "active" &&
      user.stripeOnboardingComplete === true &&
      user.stripeChargesEnabled === true
    );
  },
});
