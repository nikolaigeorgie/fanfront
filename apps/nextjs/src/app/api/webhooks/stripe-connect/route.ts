import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

import { db } from "@acme/db/client";
import { user } from "@acme/db/schema";

// Initialize Convex client for webhook events
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

// Force this route to be dynamic and not pre-rendered at build time
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return new NextResponse("No stripe signature found", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("[Stripe Webhook] Error verifying signature:", err);
    return new NextResponse(
      `Webhook Error: ${err instanceof Error ? err.message : "Unknown Error"}`,
      { status: 400 },
    );
  }

  console.log("[Stripe Webhook] Event Type:", event.type);

  try {
    switch (event.type) {
      case "account.updated": {
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      }
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error("[Stripe Webhook] Error processing event:", error);
    return new NextResponse(
      `Webhook handler failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

async function handleAccountUpdated(account: Stripe.Account) {
  console.log("[Stripe Webhook] Processing account.updated:", account.id);

  // Find user by Stripe account ID
  const existingUser = await db
    .select()
    .from(user)
    .where(eq(user.stripeAccountId, account.id))
    .limit(1);

  if (!existingUser[0]) {
    console.log("[Stripe Webhook] No user found for account:", account.id);
    return;
  }

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

  console.log("[Stripe Webhook] Updating user:", {
    userId: existingUser[0].id,
    status,
    onboardingComplete: account.details_submitted,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
  });

  // Update user in database
  await db
    .update(user)
    .set({
      stripeAccountStatus: status,
      stripeOnboardingComplete: account.details_submitted || false,
      stripeChargesEnabled: account.charges_enabled || false,
      stripePayoutsEnabled: account.payouts_enabled || false,
    })
    .where(eq(user.stripeAccountId, account.id));

  console.log(
    "[Stripe Webhook] Successfully updated user stripe status:",
    existingUser[0].id,
  );

  // Emit real-time event to Convex for client notifications
  if (convex) {
    try {
      await convex.mutation("webhooks:emitWebhookEvent" as any, {
        type: "stripe.account.updated",
        userId: existingUser[0].id,
        data: {
          stripeAccountId: account.id,
          status,
          onboardingComplete: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          message:
            status === "active"
              ? "Your Stripe account is now active!"
              : `Stripe account status: ${status}`,
        },
      });
      console.log(
        "[Stripe Webhook] Convex event emitted for user:",
        existingUser[0].id,
      );
    } catch (convexError) {
      console.error(
        "[Stripe Webhook] Failed to emit Convex event:",
        convexError,
      );
      // Don't fail the webhook if Convex notification fails
    }
  }
}
