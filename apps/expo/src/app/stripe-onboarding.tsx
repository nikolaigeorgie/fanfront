import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import tw from "twrnc";

import { trpc } from "~/utils/api";

export default function StripeOnboardingModal() {
  return (
    <WebView
      //   source={{ uri: params.url }}
      source={{ uri: "https://google.com" }}
      style={{ height: 500, width: 500, position: "fixed", top: 0, left: 0 }}
    />
  );
  const router = useRouter();
  const params = useLocalSearchParams<{ url?: string }>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  console.log("[StripeOnboarding] Modal opened with URL:", params.url);

  const { refetch: refetchUser } = useQuery(
    trpc.auth.getCurrentUser.queryOptions(),
  );
  const refreshAccountStatus = useMutation(
    trpc.stripe.refreshAccountStatus.mutationOptions(),
  );

  useEffect(() => {
    console.log("[StripeOnboarding] Component mounted");
    return () => {
      console.log("[StripeOnboarding] Component unmounted");
    };
  }, []);

  const handleNavigationStateChange = async (navState: any) => {
    const url = navState.url;
    console.log("[StripeOnboarding] Navigation URL:", url);

    // Check if user reached the redirect URL (both return and refresh cases)
    if (url.includes("fanfront.com/redirect")) {
      console.log("[StripeOnboarding] Reached redirect URL, refreshing status");
      setIsRefreshing(true);

      try {
        // Give Stripe a moment to process
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Refresh Stripe account status from Stripe API
        await refreshAccountStatus.mutateAsync();

        // Refetch user data to get updated status
        await refetchUser();

        // Show success message
        Alert.alert(
          "Setup Complete",
          "Your Stripe account has been connected successfully!",
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ],
        );
      } catch (error: any) {
        console.error("[StripeOnboarding] Error refreshing status:", error);
        Alert.alert(
          "Setup In Progress",
          "Your Stripe account is being set up. Please check back in a moment.",
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ],
        );
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const handleError = (error: any) => {
    console.error("[StripeOnboarding] WebView Error:", error);
    Alert.alert(
      "Connection Error",
      "Unable to load Stripe onboarding. Please try again.",
      [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ],
    );
  };

  if (!params.url) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white dark:bg-gray-950`}>
        <View style={tw`flex-1 items-center justify-center p-6`}>
          <Text style={tw`text-lg text-gray-900 dark:text-gray-50`}>
            No onboarding URL provided
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isRefreshing) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white dark:bg-gray-950`}>
        <View style={tw`flex-1 items-center justify-center p-6`}>
          <ActivityIndicator size="large" color="#635BFF" />
          <Text
            style={tw`mt-4 text-center text-lg text-gray-900 dark:text-gray-50`}
          >
            Verifying your Stripe account...
          </Text>
          <Text
            style={tw`mt-2 text-center text-sm text-gray-600 dark:text-gray-400`}
          >
            Please wait while we confirm your setup
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <View style={tw`flex-1`}>
        <WebView
          source={{ uri: params.url }}
          onNavigationStateChange={handleNavigationStateChange}
          onError={handleError}
          style={tw`flex-1`}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={tw`flex-1 items-center justify-center bg-white`}>
              <ActivityIndicator size="large" color="#635BFF" />
              <Text
                style={tw`mt-4 text-center text-base text-gray-600 dark:text-gray-400`}
              >
                Loading Stripe Connect...
              </Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
