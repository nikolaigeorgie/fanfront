import { ConvexReactClient } from "convex/react";

const convexUrl = "https://perfect-basilisk-357.convex.cloud";
// const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing EXPO_PUBLIC_CONVEX_URL environment variable");
}

export const convex = new ConvexReactClient(convexUrl);
