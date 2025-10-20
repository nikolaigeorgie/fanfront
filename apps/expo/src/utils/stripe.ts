// Stripe configuration
// TODO: Move these to environment variables in production
export const STRIPE_CONFIG = {
  publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  merchantIdentifier: "merchant.com.fanfront",
  urlScheme: "fanfront",
};

// Validate Stripe keys are present
if (!STRIPE_CONFIG.publishableKey) {
  console.warn(
    "Warning: EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY not set. Add it to your .env file.",
  );
}
