import { v } from "convex/values";

import { action, mutation } from "./_generated/server";

// Create a Stripe payment intent with Connect transfer
export const createPaymentIntent = action({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ clientSecret: string; paymentIntentId: string }> => {
    // Get event details
    const event = await ctx.runQuery(api.events.getEvent, {
      eventId: args.eventId,
    });

    if (!event) {
      throw new Error("Event not found");
    }

    // Get celebrity (creator) details
    const celebrity = await ctx.runQuery(api.users.getUser, {
      userId: event.celebrityId,
    });

    if (!celebrity) {
      throw new Error("Celebrity not found");
    }

    if (!celebrity.stripeAccountId) {
      throw new Error("Celebrity has not connected their Stripe account");
    }

    if (celebrity.stripeAccountStatus !== "active") {
      throw new Error("Celebrity's Stripe account is not active");
    }

    const amount = event.price || 1000; // Default to $10 if no price set

    // Calculate platform fee (10% for example)
    const platformFee = Math.floor(amount * 0.1);

    // Get Stripe secret key from environment
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    // Create payment intent with destination charge (direct payment to connected account)
    const response = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: amount.toString(),
        currency: "usd",
        application_fee_amount: platformFee.toString(),
        "transfer_data[destination]": celebrity.stripeAccountId,
        "metadata[eventId]": args.eventId,
        "metadata[userId]": args.userId,
        "metadata[celebrityId]": event.celebrityId,
        "metadata[eventTitle]": event.title,
        "metadata[celebrityStripeAccountId]": celebrity.stripeAccountId,
        description: `Queue entry for ${event.title}`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Stripe error:", error);
      throw new Error("Failed to create payment intent");
    }

    const paymentIntent = await response.json();

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  },
});

// Update payment status (called by webhook)
export const updatePaymentStatus = mutation({
  args: {
    paymentIntentId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("refunded"),
    ),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    // Find queue entry with this payment intent
    const queueEntry = await ctx.db
      .query("queueEntries")
      .withIndex("by_payment_intent", (q) => 
        q.eq("paymentIntentId", args.paymentIntentId)
      )
      .first();

    if (!queueEntry) {
      console.error("Queue entry not found for payment intent:", args.paymentIntentId);
      return null;
    }

    // Update payment status
    await ctx.db.patch(queueEntry._id, {
      paymentStatus: args.status,
      amountPaid: args.amount,
    });

    // If payment failed, cancel the queue entry
    if (args.status === "failed") {
      await ctx.db.patch(queueEntry._id, {
        status: "cancelled",
      });

      // Create notification
      await ctx.db.insert("notifications", {
        userId: queueEntry.userId,
        eventId: queueEntry.eventId,
        queueEntryId: queueEntry._id,
        type: "queue_joined",
        message: "Your payment failed. Queue entry has been cancelled.",
        isRead: false,
        createdAt: Date.now(),
      });
    }

    // If payment succeeded, ensure entry is in waiting status
    if (args.status === "succeeded" && queueEntry.status !== "waiting") {
      await ctx.db.patch(queueEntry._id, {
        status: "waiting",
      });
    }

    return queueEntry._id;
  },
});

// Verify payment status (for client polling)
export const verifyPayment = action({
  args: {
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args): Promise<{ status: string; amount: number }> => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    // Retrieve payment intent from Stripe
    const response = await fetch(
      `https://api.stripe.com/v1/payment_intents/${args.paymentIntentId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to verify payment");
    }

    const paymentIntent = await response.json();

    return {
      status: paymentIntent.status,
      amount: paymentIntent.amount,
    };
  },
});

// Refund payment (for cancelled queue entries)
export const refundPayment = action({
  args: {
    paymentIntentId: v.string(),
    queueEntryId: v.id("queueEntries"),
  },
  handler: async (ctx, args): Promise<{ refundId: string }> => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    // Create refund with Stripe
    const response = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        payment_intent: args.paymentIntentId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Stripe refund error:", error);
      throw new Error("Failed to create refund");
    }

    const refund = await response.json();

    // Update queue entry payment status
    await ctx.runMutation(api.payments.updatePaymentStatus, {
      paymentIntentId: args.paymentIntentId,
      status: "refunded",
      amount: refund.amount,
    });

    return {
      refundId: refund.id,
    };
  },
});
