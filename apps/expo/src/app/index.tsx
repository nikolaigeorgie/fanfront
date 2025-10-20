import { Redirect } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import LoadingScreen from "~/components/LoadingScreen";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

export default function Index() {
  const { data: session, isPending } = authClient.useSession();

  // Fetch user profile from database using tRPC
  // Always fetch fresh data to ensure correct routing
  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
    ...trpc.auth.getCurrentUser.queryOptions(undefined),
    enabled: !!session,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
  });

  if (isPending || isLoadingProfile) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Redirect href="/landing" />;
  }

  // Debug logging
  console.log("=== INDEX PAGE ROUTING ===");
  console.log("User profile:", JSON.stringify(userProfile, null, 2));
  console.log("User type:", userProfile?.userType);
  console.log("Is celebrity?", userProfile?.userType === "celebrity");

  // Route based on user type from database
  if (userProfile?.userType === "celebrity") {
    console.log("→ Redirecting to CREATOR dashboard");
    return <Redirect href="/creator-dashboard" />;
  }

  console.log("→ Redirecting to FAN dashboard");
  return <Redirect href="/fan-dashboard" />;
}
