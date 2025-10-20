import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  LeaseStatus,
  PaymentMedium,
  PaymentStatus,
  prisma,
  SubscriptionStatus,
  SubscriptionType,
} from "@tigra/db";
import { sendEmail } from "@tigra/lib/email";
import {
  getSubscriptionPlan,
  SUBSCRIPTION_PLANS,
} from "@tigra/lib/subscription-plans";
import { paidRent } from "@tigra/lib/templates/paid-rent";
import { paidSecurityDeposit } from "@tigra/lib/templates/paid-security-deposit";
import { subscriptionSuccess } from "@tigra/lib/templates/subscription-success";
import { unsubscribed } from "@tigra/lib/templates/unsubscribed";
import Stripe from "stripe";

// TODO: Fix from client error
// import { env } from "~/env";

// const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
//   apiVersion: "2024-12-18.acacia",
// });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature");
  if (!signature) {
    return new NextResponse("No stripe signature found", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (err) {
    return new NextResponse(
      `Webhook Error: ${err instanceof Error ? err.message : "Unknown Error"}`,
      { status: 400 },
    );
  }

  console.log("Event Type:", event?.type);

  switch (event.type) {
    // Not sure if necessary
    // case "checkout.session.completed": {
    //   const session = event.data.object as Stripe.Checkout.Session;
    //   console.log("Checkout Session:", session);
    //   await handlePaymentSuccess(session.metadata);
    //   break;
    // }
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSuccess(
        paymentIntent.id,
        paymentIntent.customer as string,
      );
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function handlePaymentSuccess(payment_id: string, customer: string) {
  const stripeCustomer = (await stripe.customers.retrieve(
    customer as string,
  )) as any;
  console.log({ stripeCustomer });

  const organization_id = stripeCustomer?.metadata?.organizationId;
  const payment_type = stripeCustomer?.metadata?.paymentType;
  const lease_id = stripeCustomer?.metadata?.leaseId;
  const property_id = stripeCustomer?.metadata?.propertyId;
  const unit_id = stripeCustomer?.metadata?.unitId;
  const amount = stripeCustomer?.metadata?.amount;
  const payment_name = stripeCustomer?.metadata?.paymentName;

  if (!organization_id) {
    throw new Error("Organization ID not found in customer metadata");
  }

  if (!payment_type) {
    throw new Error("Payment type not found in customer metadata");
  }

  const org = await prisma.organization.findUnique({
    where: { id: organization_id },
    include: {
      users: {
        where: { role: "owner" },
        include: { user: true },
      },
    },
  });

  if (!org) throw new Error("Organization not found");

  // Record the successful payment with proper upsert
  const payment = await prisma.payment.upsert({
    where: { id: payment_id },
    create: {
      id: payment_id,
      payerId: organization_id,
      leaseId: lease_id || null,
      propertyId: property_id || null,
      unitId: unit_id || null,
      amount: amount ? parseFloat(amount) : 0,
      paymentName: payment_name || `${payment_type} payment`,
      paymentMethod: "CARD",
      status: PaymentStatus.APPROVED,
      paidAt: new Date(),
    },
    update: {
      status: PaymentStatus.APPROVED,
      paidAt: new Date(),
    },
    include: {
      lease: {
        include: {
          tenant: true,
          unit: {
            include: {
              property: {
                include: {
                  owner: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Create transaction record - handle duplicates gracefully
  try {
    await prisma.transaction.create({
      data: {
        paymentId: payment.id,
        payerId: org.users[0]?.user?.id || "",
        recipientId: payment.lease?.unit?.property?.owner?.id || "",
        amount: payment.amount,
        status: "VERIFIED",
        paymentMethod: "CARD",
        paymentMedium: PaymentMedium.SYSTEM,
        paymentDetails: `Stripe payment for ${payment_type}`,
        paidAt: new Date(),
      },
    });
  } catch (error) {
    // Ignore duplicate transaction errors from webhook retries
    console.log("Transaction may already exist for payment:", payment.id);
  }

  // Send email notification based on payment type
  if (payment.lease?.unit?.property?.owner?.email) {
    const landlordEmail = payment.lease.unit.property.owner.email;
    const tenantName = `${payment.lease.tenant.firstName} ${payment.lease.tenant.lastName}`;
    const propertyName = payment.lease.unit.property.name ?? "Property";
    const unitName = payment.lease.unit.unit_number;
    const landlordName = payment.lease.unit.property.owner.firstName
      ? `${payment.lease.unit.property.owner.firstName} ${payment.lease.unit.property.owner.lastName}`
      : "Property Owner";

    const emailData = {
      tenantName,
      propertyName,
      unitName,
      paymentDate: new Date().toLocaleDateString(),
      landlordName,
      organizationName: "Tigra",
      paymentMethod: "Credit Card", // Or dynamically set based on payment method
    };

    if (payment_type === "rent") {
      await sendEmail({
        recipients: [landlordEmail],
        emailData: {
          ...emailData,
          rentAmount: Number(payment.amount),
        },
        template: "paidRent",
      });
    } else if (payment_type === "securityDeposit") {
      await sendEmail({
        recipients: [landlordEmail],
        emailData: {
          ...emailData,
          depositAmount: Number(payment.amount),
        },
        template: "securityDeposit",
      });
    }
  }

  // Handle post-payment actions for security deposit
  if (payment_type === "securityDeposit" && lease_id) {
    await prisma.lease.update({
      where: { id: lease_id },
      data: {
        status: LeaseStatus.ACTIVE,
        isPaid: true,
      },
    });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  if (!subscription) {
    console.error("No subscription event data received");
    return;
  }

  // Get organization details
  const organization = await prisma.organization.findFirst({
    where: { stripeCustomerId: subscription.customer as string },
    include: {
      users: {
        where: { role: "owner" },
        include: { user: true },
      },
    },
  });

  if (!organization) {
    console.error(`Organization not found: ${subscription.customer}`);
    return;
  }

  // For now, treat all subscription updates as potential billing period changes
  // TODO: Add proper billing period detection based on Stripe event data
  const isNewBillingPeriod = false;

  // Determine the new subscription status
  let subscriptionStatus: SubscriptionStatus;

  switch (subscription.status) {
    case "active":
      subscriptionStatus = SubscriptionStatus.ACTIVE;
      break;
    case "canceled":
      subscriptionStatus = SubscriptionStatus.CANCELED;
      break;
    case "past_due":
      subscriptionStatus = SubscriptionStatus.UNPAID;
      break;
    case "unpaid":
      subscriptionStatus = SubscriptionStatus.UNPAID;
      break;
    default:
      subscriptionStatus = SubscriptionStatus.INACTIVE;
  }

  // Only update if status changed or it's a new billing period
  if (
    isNewBillingPeriod ||
    organization.subscriptionStatus !== subscriptionStatus
  ) {
    // Update organization subscription status
    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        subscriptionStatus,
        subscriptionType:
          (subscription.metadata?.type as SubscriptionType) ||
          SubscriptionType.REGULAR,
      },
    });

    // Send email notification only for new billing periods or status changes to active
    if (
      organization.users[0]?.user?.email &&
      (isNewBillingPeriod ||
        (subscriptionStatus === SubscriptionStatus.ACTIVE &&
          organization.subscriptionStatus !== SubscriptionStatus.ACTIVE))
    ) {
      const planType =
        (subscription.metadata?.type as keyof typeof SUBSCRIPTION_PLANS) ||
        "REGULAR";
      const plan = getSubscriptionPlan(planType);

      await sendEmail({
        recipients: [organization.users[0].user.email],
        emailData: {
          organizationName: organization.name,
          planName: plan.name,
          planAmount: plan.price,
          billingPeriod: "month",
          nextBillingDate: new Date(
            subscription.current_period_end * 1000,
          ).toLocaleDateString(),
          subscriptionStatus: subscriptionStatus,
          paymentMethod: "Credit Card",
          isRenewal: isNewBillingPeriod,
        },
        template: isNewBillingPeriod
          ? "subscriptionRenewed"
          : "subscriptionConfirmation",
      });
    }
  }

  return;
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  if (!subscription) {
    console.error("No subscription data received");
    return;
  }

  // Get organization details
  const organization = await prisma.organization.findFirst({
    where: { stripeCustomerId: subscription.customer as string },
    include: {
      users: {
        where: { role: "owner" },
        include: { user: true },
      },
    },
  });

  if (!organization) {
    console.error(`Organization not found: ${subscription.customer}`);
    return;
  }

  // Update organization subscription status
  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      subscriptionStatus: SubscriptionStatus.CANCELED,
      subscriptionType: null, // Clear the subscription type
    },
  });

  // Send cancellation email
  if (organization.users[0]?.user?.email) {
    const planDetails = {
      PREMIUM: {
        name: "Premium Plan",
      },
      REGULAR: {
        name: "Regular Plan",
      },
    };

    const planType =
      (subscription.metadata?.type as keyof typeof planDetails) || "REGULAR";
    const plan = planDetails[planType];

    await sendEmail({
      recipients: [organization.users[0].user.email],
      emailData: {
        organizationName: organization.name,
        planName: plan.name,
        cancellationDate: new Date().toLocaleDateString(),
        effectiveEndDate: new Date(
          subscription.current_period_end * 1000,
        ).toLocaleDateString(),
      },
      template: "unsubscribed",
    });
  }

  return;
}
