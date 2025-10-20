import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import tw from "twrnc";

import { trpc } from "~/utils/api";

export default function StripeOnboardingModal() {
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
    console.log("[StripeOnboarding] URL param:", params.url);
    console.log("[StripeOnboarding] URL type:", typeof params.url);
    console.log("[StripeOnboarding] URL length:", params.url?.length);
    return () => {
      console.log("[StripeOnboarding] Component unmounted");
    };
  }, [params.url]);

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
    console.error(
      "[StripeOnboarding] WebView Error:",
      JSON.stringify(error, null, 2),
    );
    console.error("[StripeOnboarding] Error code:", error?.nativeEvent?.code);
    console.error(
      "[StripeOnboarding] Error description:",
      error?.nativeEvent?.description,
    );
    console.error(
      "[StripeOnboarding] URL that failed:",
      error?.nativeEvent?.url,
    );
    Alert.alert(
      "Connection Error",
      `Unable to load Stripe onboarding. ${error?.nativeEvent?.description || "Please try again."}`,
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
          <Text style={tw`text-lg text-gray-900 dark:text-gray-50 mb-4`}>
            No onboarding URL provided
          </Text>
          <Text style={tw`text-sm text-gray-600 dark:text-gray-400 mb-4`}>
            Check console for debugging information
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={tw`px-6 py-3 bg-gray-900 rounded-lg`}
          >
            <Text style={tw`text-white font-semibold`}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Handle case where URL might be an array (common router issue)
  const urlString = Array.isArray(params.url) ? params.url[0] : params.url;

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

  console.log("[StripeOnboarding] Rendering WebView with URL:", urlString);

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Header with close button */}
      <View
        style={tw`px-4 py-3 border-b border-gray-200 flex-row items-center justify-between`}
      >
        <Text style={tw`text-lg font-semibold text-gray-900`}>
          Stripe Connect Setup
        </Text>
        <Pressable
          onPress={() => {
            Alert.alert(
              "Cancel Setup?",
              "Are you sure you want to cancel the Stripe setup?",
              [
                { text: "Continue Setup", style: "cancel" },
                {
                  text: "Cancel",
                  style: "destructive",
                  onPress: () => router.back(),
                },
              ],
            );
          }}
          style={tw`px-3 py-1`}
        >
          <Text style={tw`text-base text-gray-600`}>✕</Text>
        </Pressable>
      </View>

      {/* WebView */}
      <View style={tw`flex-1`}>
        <WebView
          source={{ uri: urlString }}
          onNavigationStateChange={handleNavigationStateChange}
          onError={handleError}
          onLoadStart={() =>
            console.log("[StripeOnboarding] WebView load started")
          }
          onLoadEnd={() => console.log("[StripeOnboarding] WebView load ended")}
          onLoad={() => console.log("[StripeOnboarding] WebView loaded")}
          onMessage={(event) =>
            console.log("[StripeOnboarding] Message:", event.nativeEvent.data)
          }
          style={tw`flex-1`}
          startInLoadingState={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
          cacheEnabled={false}
          incognito={false}
          thirdPartyCookiesEnabled={true}
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
