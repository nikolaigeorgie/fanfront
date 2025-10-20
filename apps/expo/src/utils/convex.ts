import { ConvexReactClient, useMutation, useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";

const convexUrl = "https://perfect-basilisk-357.convex.cloud";
// const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing EXPO_PUBLIC_CONVEX_URL environment variable");
}

export const convex = new ConvexReactClient(convexUrl);

// Export API for easy access
export { api };

// Export Convex hooks for components to use
export function useConvex() {
  return convex;
}

export function useConvexQuery(query: any, args?: any) {
  return useQuery(query, args);
}

export function useConvexMutation(mutation: any) {
  return useMutation(mutation);
}
