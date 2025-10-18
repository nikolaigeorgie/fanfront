import { Redirect } from "expo-router";

import LoadingScreen from "~/components/LoadingScreen";
import { authClient } from "~/utils/auth";

export default function Index() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Redirect href="/landing" />;
  }

  // Route based on user type
  const userType = (session.user as any).userType;

  if (userType === "celebrity") {
    return <Redirect href="/creator-dashboard" />;
  }

  return <Redirect href="/fan-dashboard" />;
}
