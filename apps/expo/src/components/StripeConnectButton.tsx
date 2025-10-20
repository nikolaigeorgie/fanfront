import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import { useQuery as useConvexQuery, useMutation } from "convex/react";
import tw from "twrnc";

import { api } from "~/utils/api";
import { api as convexApi } from "../../convex/_generated/api";

interface StripeConnectButtonProps {
  userId: string;
}

export function StripeConnectButton({ userId }: StripeConnectButtonProps) {
  const [loading, setLoading] = useState(false);

  // Use tRPC for Stripe operations
  const createConnectAccount = api.stripe.createConnectAccount.useMutation();
  const getConnectAccountLink = api.stripe.getConnectAccountLink.useMutation();
  const getDashboardLink = api.stripe.getDashboardLink.useMutation();
  const refreshAccountStatus = api.stripe.refreshAccountStatus.useQuery(
    { stripeAccountId: "" },
    { enabled: false },
  );

  // Use Convex for user data
  const user = useConvexQuery(convexApi.users.getUser, {
    userId: userId as any,
  });
  const updateStripeAccount = useMutation(
    convexApi.stripeConnect.updateStripeAccount,
  );

  const handleConnectStripe = async () => {
    try {
      setLoading(true);

      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      let onboardingUrl: string;

      // Check if user already has Stripe account
      if (user.stripeAccountId) {
        // Get new onboarding link for existing account
        const result = await getConnectAccountLink.mutateAsync({
          stripeAccountId: user.stripeAccountId,
        });
        onboardingUrl = result.onboardingUrl;
      } else {
        // Create new Stripe account
        const result = await createConnectAccount.mutateAsync({
          userId: userId,
          email: user.email,
          name: user.name,
        });

        // Update Convex with the new account ID
        await updateStripeAccount({
          userId: userId as any,
          stripeAccountId: result.accountId,
          stripeAccountStatus: "pending",
          stripeOnboardingComplete: false,
        });

        onboardingUrl = result.onboardingUrl;
      }

      // Open Stripe onboarding in browser
      const supported = await Linking.canOpenURL(onboardingUrl);
      if (supported) {
        await Linking.openURL(onboardingUrl);

        // Show instructions
        Alert.alert(
          "Complete Onboarding",
          "Please complete the Stripe onboarding process in your browser. When finished, return to the app and tap 'Refresh Status'.",
          [{ text: "OK" }],
        );
      } else {
        Alert.alert("Error", "Cannot open Stripe onboarding page");
      }
    } catch (error: any) {
      console.error("Stripe Connect error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to start Stripe onboarding",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewDashboard = async () => {
    try {
      setLoading(true);

      if (!user?.stripeAccountId) {
        Alert.alert("Error", "No Stripe account found");
        return;
      }

      const { dashboardUrl } = await getDashboardLink.mutateAsync({
        stripeAccountId: user.stripeAccountId,
      });

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
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    try {
      setLoading(true);

      if (!user?.stripeAccountId) {
        Alert.alert("Error", "No Stripe account found");
        return;
      }

      // Fetch status from Stripe via tRPC
      const { data: statusData } = await refreshAccountStatus.refetch({
        stripeAccountId: user.stripeAccountId,
      });

      if (statusData) {
        // Update Convex with the refreshed status
        await updateStripeAccount({
          userId: userId as any,
          stripeAccountStatus: statusData.status,
          stripeOnboardingComplete: statusData.onboardingComplete,
          stripeChargesEnabled: statusData.chargesEnabled,
          stripePayoutsEnabled: statusData.payoutsEnabled,
        });

        Alert.alert("Success", "Account status refreshed");
      }
    } catch (error: any) {
      console.error("Refresh status error:", error);
      Alert.alert("Error", error.message || "Failed to refresh status");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={tw`items-center justify-center py-4`}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  // No Stripe account yet
  if (!user.stripeAccountId) {
    return (
      <Pressable
        onPress={handleConnectStripe}
        style={({ pressed }) => [
          tw`rounded-2xl bg-[#635BFF] px-6 py-4 flex-row items-center justify-center`,
          {
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <Text style={tw`text-lg font-bold text-white mr-2`}>
          Connect Stripe Account
        </Text>
        <Text style={tw`text-lg`}>→</Text>
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
            style={({ pressed }) => [
              tw`flex-1 rounded-2xl bg-[#635BFF] px-4 py-3`,
              {
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={tw`text-center font-semibold text-white`}>
              Complete Setup
            </Text>
          </Pressable>
        )}

        {user.stripeAccountStatus === "active" && (
          <Pressable
            onPress={handleViewDashboard}
            style={({ pressed }) => [
              tw`flex-1 rounded-2xl bg-[#635BFF] px-4 py-3`,
              {
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={tw`text-center font-semibold text-white`}>
              View Dashboard
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleRefreshStatus}
          style={({ pressed }) => [
            tw`flex-1 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 px-4 py-3`,
            {
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <Text
            style={tw`text-center font-semibold text-gray-900 dark:text-gray-50`}
          >
            Refresh Status
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
