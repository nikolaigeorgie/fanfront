import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import tw from "twrnc";

import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

export function StripeConnectButton() {
  const router = useRouter();
  const [connectLoading, setConnectLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);

  // Get user profile with Stripe data from tRPC
  const { data: user, refetch: refetchUser } = useQuery(
    trpc.auth.getCurrentUser.queryOptions(undefined),
  );

  // Use tRPC for all Stripe operations
  const createConnectAccount = useMutation(
    trpc.stripe.createConnectAccount.mutationOptions(),
  );
  const getConnectAccountLink = useMutation(
    trpc.stripe.getConnectAccountLink.mutationOptions(),
  );
  const getDashboardLink = useMutation(
    trpc.stripe.getDashboardLink.mutationOptions(),
  );
  const refreshAccountStatus = useMutation(
    trpc.stripe.refreshAccountStatus.mutationOptions(),
  );

  const handleConnectStripe = async () => {
    try {
      setConnectLoading(true);

      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      console.log("[StripeConnect] Starting connection for user:", user.id);
      console.log(
        "[StripeConnect] Has existing account:",
        !!user.stripeAccountId,
      );

      let onboardingUrl: string;

      // Check if user already has Stripe account
      if (user.stripeAccountId) {
        console.log(
          "[StripeConnect] Getting onboarding link for existing account",
        );
        // Get new onboarding link for existing account
        const result = await getConnectAccountLink.mutateAsync(undefined);
        console.log("[StripeConnect] Got link:", result);
        onboardingUrl = result.onboardingUrl;
      } else {
        console.log("[StripeConnect] Creating new Stripe account");
        // Create new Stripe account (stores in database automatically)
        const result = await createConnectAccount.mutateAsync(undefined);
        console.log("[StripeConnect] Created account:", result);
        onboardingUrl = result.onboardingUrl;
      }

      console.log("[StripeConnect] Onboarding URL:", onboardingUrl);
      console.log("[StripeConnect] URL type:", typeof onboardingUrl);
      console.log("[StripeConnect] URL length:", onboardingUrl?.length);

      if (!onboardingUrl) {
        throw new Error("No onboarding URL returned from server");
      }

      // Navigate to WebView modal for in-app onboarding
      console.log("[StripeConnect] Navigating to modal with params:", {
        pathname: "/stripe-onboarding",
        params: { url: onboardingUrl },
      });

      router.push({
        pathname: "/stripe-onboarding",
        params: { url: onboardingUrl },
      });
    } catch (error: any) {
      console.error("[StripeConnect] Full error:", error);
      console.error("[StripeConnect] Error message:", error.message);
      console.error("[StripeConnect] Error data:", error.data);
      Alert.alert(
        "Stripe Connect Error",
        error.data?.message ||
          error.message ||
          "Failed to start Stripe onboarding. Check console for details.",
      );
    } finally {
      setConnectLoading(false);
    }
  };

  const handleViewDashboard = async () => {
    try {
      setDashboardLoading(true);

      if (!user?.stripeAccountId) {
        Alert.alert("Error", "No Stripe account found");
        return;
      }

      const { dashboardUrl } = await getDashboardLink.mutateAsync();

      const supported = await Linking.canOpenURL(dashboardUrl);
      if (supported) {
        await Linking.openURL(dashboardUrl);
      } else {
        Alert.alert("Error", "Cannot open Stripe dashboard");
      }
    } catch (error: any) {
      console.error("Dashboard link error:", error);
      Alert.alert("Error", error.message || "Failed to open dashboard");
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    try {
      setRefreshLoading(true);

      if (!user?.stripeAccountId) {
        Alert.alert("Error", "No Stripe account found");
        return;
      }

      // Fetch status from Stripe via tRPC (automatically updates database)
      await refreshAccountStatus.mutateAsync();

      // Refetch user data to get updated status
      await refetchUser();

      Alert.alert("Success", "Account status refreshed");
    } catch (error: any) {
      console.error("Refresh status error:", error);
      Alert.alert("Error", error.message || "Failed to refresh status");
    } finally {
      setRefreshLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  // No Stripe account yet
  if (!user.stripeAccountId) {
    return (
      <Pressable
        onPress={handleConnectStripe}
        disabled={connectLoading}
        style={({ pressed }) => [
          tw`rounded-2xl bg-[#635BFF] px-6 py-4 flex-row items-center justify-center`,
          {
            opacity: pressed || connectLoading ? 0.7 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        {connectLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Text style={tw`text-lg font-bold text-white mr-2`}>
              Connect Stripe Account
            </Text>
            <Text style={tw`text-lg`}>→</Text>
          </>
        )}
      </Pressable>
    );
  }

  // Show status indicator
  const getStatusColor = () => {
    switch (user.stripeAccountStatus) {
      case "active":
        return "bg-green-500";
      case "pending":
      case "restricted":
        return "bg-yellow-500";
      case "rejected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (user.stripeAccountStatus) {
      case "active":
        return "Active - Ready to accept payments";
      case "pending":
        return "Pending - Complete onboarding";
      case "restricted":
        return "Restricted - Additional info needed";
      case "rejected":
        return "Rejected - Contact support";
      default:
        return "Unknown status";
    }
  };

  return (
    <View style={tw`gap-3`}>
      {/* Status Card */}
      <View
        style={tw`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5`}
      >
        <View style={tw`flex-row items-center mb-3`}>
          <View style={tw`${getStatusColor()} h-3 w-3 rounded-full mr-2`} />
          <Text
            style={tw`text-base font-semibold text-gray-900 dark:text-gray-50`}
          >
            Stripe Connect Status
          </Text>
        </View>
        <Text style={tw`text-sm text-gray-600 dark:text-gray-400 mb-2`}>
          {getStatusText()}
        </Text>
        {user.stripeAccountStatus !== "active" && (
          <Text style={tw`text-xs text-yellow-600 dark:text-yellow-400`}>
            ⚠️ You must complete onboarding to create paid events
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={tw`flex-row gap-3`}>
        {user.stripeAccountStatus !== "active" && (
          <Pressable
            onPress={handleConnectStripe}
            disabled={connectLoading}
            style={({ pressed }) => [
              tw`flex-1 rounded-2xl bg-[#635BFF] px-4 py-3 flex-row items-center justify-center`,
              {
                opacity: pressed || connectLoading ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            {connectLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={tw`text-center font-semibold text-white`}>
                Complete Setup
              </Text>
            )}
          </Pressable>
        )}

        {user.stripeAccountStatus === "active" && (
          <Pressable
            onPress={handleViewDashboard}
            disabled={dashboardLoading}
            style={({ pressed }) => [
              tw`flex-1 rounded-2xl bg-[#635BFF] px-4 py-3 flex-row items-center justify-center`,
              {
                opacity: pressed || dashboardLoading ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            {dashboardLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={tw`text-center font-semibold text-white`}>
                View Dashboard
              </Text>
            )}
          </Pressable>
        )}

        <Pressable
          onPress={handleRefreshStatus}
          disabled={refreshLoading}
          style={({ pressed }) => [
            tw`flex-1 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 px-4 py-3 flex-row items-center justify-center`,
            {
              opacity: pressed || refreshLoading ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          {refreshLoading ? (
            <ActivityIndicator size="small" color="#666666" />
          ) : (
            <Text
              style={tw`text-center font-semibold text-gray-900 dark:text-gray-50`}
            >
              Refresh Status
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
