import { Text } from "react-native";
import { Redirect } from "expo-router";

import { authClient } from "~/utils/auth";

export default function Index() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Text className="mt-10 text-xl text-red-500">Loading...</Text>;
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
