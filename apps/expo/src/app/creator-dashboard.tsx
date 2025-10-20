import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import tw from "twrnc";

import { StripeConnectButton } from "~/components/StripeConnectButton";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";
import { api, useConvexQuery } from "~/utils/convex";

export default function CreatorDashboard() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [activeTab, setActiveTab] = useState<"events" | "queue" | "analytics">(
    "events",
  );

  // Get user data from tRPC (includes Stripe info)
  const { data: user } = useQuery(trpc.auth.getCurrentUser.queryOptions());

  // Check if user can create events (Stripe onboarded)
  const { data: canCreateEvents } = useQuery(
    trpc.auth.canCreateEvents.queryOptions(),
  );

  // First get the Convex user by auth ID (still needed for events)
  const convexUser = useConvexQuery(
    api.users.getUserByAuthId,
    session?.user?.id ? { authUserId: session.user.id } : "skip",
  );

  // Load creator's events from Convex using the Convex user ID
  const creatorEvents = useConvexQuery(
    api.events.getEventsByCelebrity,
    convexUser?._id ? { celebrityId: convexUser._id } : "skip",
  );

  const activeEvents = creatorEvents?.filter((e: any) => e.isActive) || [];
  const totalInQueue = activeEvents.reduce(
    (sum: number, e: any) => sum + (e.currentQueueCount || 0),
    0,
  );

  const handleCreateEventClick = () => {
    if (!canCreateEvents) {
      Alert.alert(
        "Complete Stripe Onboarding",
        "You must connect your Stripe account and complete onboarding before creating events. This allows you to receive payments from fans.",
        [{ text: "OK" }],
      );
      return;
    }
    router.push("/create-event");
  };

  return (
    <View style={tw`flex-1 bg-white dark:bg-gray-950`}>
      <SafeAreaView style={tw`flex-1`}>
        {/* <CreatePostForm /> */}
        {/* Header */}
        <View style={tw`px-6 pt-4 pb-2`}>
          <View style={tw`flex-row items-center justify-between mb-6`}>
            <View>
              <Text
                style={tw`text-2xl font-bold text-gray-900 dark:text-gray-50`}
              >
                Creator<Text style={tw`text-[#E91E63]`}> Dashboard</Text>
              </Text>
              <Text style={tw`text-sm text-gray-500 dark:text-gray-400 mt-1`}>
                Welcome back, {session?.user?.name}
              </Text>
            </View>
            <Pressable
              onPress={async () => {
                await authClient.signOut();
                router.replace("/");
              }}
              style={tw`rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 px-3 py-1.5`}
            >
              <Text style={tw`text-sm text-gray-900 dark:text-gray-50`}>
                Sign Out
              </Text>
            </Pressable>
          </View>

          {/* Stats Cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={tw`-mx-2 mb-6`}
            contentContainerStyle={tw`px-2 gap-3`}
          >
            <View
              style={tw`rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-6 py-4 min-w-40`}
            >
              <Text style={tw`text-sm text-gray-500 dark:text-gray-400 mb-1`}>
                Active Events
              </Text>
              <Text
                style={tw`text-3xl font-bold text-gray-900 dark:text-gray-50`}
              >
                {activeEvents.length}
              </Text>
            </View>
            <View
              style={tw`rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-6 py-4 min-w-40`}
            >
              <Text style={tw`text-sm text-gray-500 dark:text-gray-400 mb-1`}>
                In Queue
              </Text>
              <Text style={tw`text-3xl font-bold text-[#E91E63]`}>
                {totalInQueue}
              </Text>
            </View>
            <View
              style={tw`rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-6 py-4 min-w-40`}
            >
              <Text style={tw`text-sm text-gray-500 dark:text-gray-400 mb-1`}>
                Total Fans
              </Text>
              <Text
                style={tw`text-3xl font-bold text-gray-900 dark:text-gray-50`}
              >
                0
              </Text>
            </View>
          </ScrollView>

          {/* Tab Navigation */}
          <View style={tw`flex-row gap-2`}>
            <Pressable
              onPress={() => setActiveTab("events")}
              style={[
                tw`flex-1 rounded-xl py-3`,
                activeTab === "events"
                  ? tw`bg-[#E91E63]`
                  : tw`bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800`,
              ]}
            >
              <Text
                style={[
                  tw`text-center font-semibold`,
                  activeTab === "events"
                    ? tw`text-white dark:text-gray-950`
                    : tw`text-gray-500 dark:text-gray-400`,
                ]}
              >
                Events
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab("queue")}
              style={[
                tw`flex-1 rounded-xl py-3`,
                activeTab === "queue"
                  ? tw`bg-[#E91E63]`
                  : tw`bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800`,
              ]}
            >
              <Text
                style={[
                  tw`text-center font-semibold`,
                  activeTab === "queue"
                    ? tw`text-white dark:text-gray-950`
                    : tw`text-gray-500 dark:text-gray-400`,
                ]}
              >
                Queue
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab("analytics")}
              style={[
                tw`flex-1 rounded-xl py-3`,
                activeTab === "analytics"
                  ? tw`bg-[#E91E63]`
                  : tw`bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800`,
              ]}
            >
              <Text
                style={[
                  tw`text-center font-semibold`,
                  activeTab === "analytics"
                    ? tw`text-white dark:text-gray-950`
                    : tw`text-gray-500 dark:text-gray-400`,
                ]}
              >
                Analytics
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Content Area */}
        <ScrollView style={tw`flex-1 px-6`}>
          {activeTab === "events" && (
            <View style={tw`pb-6`}>
              {/* Stripe Connect Section */}
              <View style={tw`pt-4 pb-6`}>
                <Text
                  style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3`}
                >
                  PAYMENT SETUP
                </Text>
                <StripeConnectButton />
              </View>

              {!creatorEvents || creatorEvents.length === 0 ? (
                /* Empty State */
                <View style={tw`items-center py-16`}>
                  <View
                    style={tw`mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900`}
                  >
                    <Text style={tw`text-4xl`}>🎪</Text>
                  </View>
                  <Text
                    style={tw`mb-2 text-center text-2xl font-bold text-gray-900 dark:text-gray-50`}
                  >
                    No Events Yet
                  </Text>
                  <Text
                    style={tw`mb-8 text-center text-base leading-relaxed text-gray-600 dark:text-gray-400 px-8`}
                  >
                    Create your first event to start managing queues and
                    engaging with fans
                  </Text>
                  <Pressable
                    onPress={handleCreateEventClick}
                    style={({ pressed }) => [
                      tw`rounded-2xl bg-[#E91E63] px-8 py-4`,
                      {
                        opacity: pressed
                          ? 0.9
                          : canCreateEvents === false
                            ? 0.5
                            : 1,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                    ]}
                  >
                    <Text
                      style={tw`text-lg font-semibold text-white dark:text-gray-950`}
                    >
                      Create Event
                    </Text>
                  </Pressable>
                </View>
              ) : (
                /* Events List */
                <View style={tw`gap-4 pt-4`}>
                  {creatorEvents.map((event: any) => (
                    <Pressable
                      key={event._id}
                      style={({ pressed }) => [
                        tw`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5`,
                        {
                          opacity: pressed ? 0.9 : 1,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                      ]}
                    >
                      <View
                        style={tw`flex-row items-start justify-between mb-3`}
                      >
                        <View style={tw`flex-1 mr-3`}>
                          <Text
                            style={tw`text-lg font-bold text-gray-900 dark:text-gray-50 mb-1`}
                          >
                            {event.title}
                          </Text>
                          <Text
                            style={tw`text-sm text-gray-600 dark:text-gray-400`}
                          >
                            📍 {event.location}
                          </Text>
                        </View>
                        <View
                          style={[
                            tw`rounded-full px-3 py-1`,
                            event.isActive
                              ? tw`bg-green-100 dark:bg-green-950`
                              : tw`bg-gray-100 dark:bg-gray-800`,
                          ]}
                        >
                          <Text
                            style={[
                              tw`text-xs font-semibold`,
                              event.isActive
                                ? tw`text-green-700 dark:text-green-300`
                                : tw`text-gray-600 dark:text-gray-400`,
                            ]}
                          >
                            {event.isActive ? "Active" : "Inactive"}
                          </Text>
                        </View>
                      </View>

                      <View style={tw`flex-row items-center gap-4 mb-3`}>
                        <Text
                          style={tw`text-sm text-gray-600 dark:text-gray-400`}
                        >
                          🎫 Code:{" "}
                          <Text style={tw`font-bold text-[#E91E63]`}>
                            {event.eventCode}
                          </Text>
                        </Text>
                        <Text
                          style={tw`text-sm text-gray-600 dark:text-gray-400`}
                        >
                          ⏱️ {event.slotDuration}min slots
                        </Text>
                      </View>

                      <View
                        style={tw`flex-row items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800`}
                      >
                        <View>
                          <Text
                            style={tw`text-xs text-gray-500 dark:text-gray-400 mb-1`}
                          >
                            In Queue
                          </Text>
                          <Text style={tw`text-2xl font-bold text-[#E91E63]`}>
                            {event.currentQueueCount || 0}
                          </Text>
                        </View>
                        <View>
                          <Text
                            style={tw`text-xs text-gray-500 dark:text-gray-400 mb-1`}
                          >
                            Available Slots
                          </Text>
                          <Text
                            style={tw`text-2xl font-bold text-gray-900 dark:text-gray-50`}
                          >
                            {event.availableSlots || 0}
                          </Text>
                        </View>
                        <View>
                          <Text
                            style={tw`text-xs text-gray-500 dark:text-gray-400 mb-1`}
                          >
                            Capacity
                          </Text>
                          <Text
                            style={tw`text-2xl font-bold text-gray-900 dark:text-gray-50`}
                          >
                            {event.maxCapacity}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {activeTab === "queue" && (
            <View style={tw`pb-6`}>
              {/* Empty State */}
              <View style={tw`items-center py-16`}>
                <View
                  style={tw`mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900`}
                >
                  <Text style={tw`text-4xl`}>👥</Text>
                </View>
                <Text
                  style={tw`mb-2 text-center text-2xl font-bold text-gray-900 dark:text-gray-50`}
                >
                  No Active Queue
                </Text>
                <Text
                  style={tw`text-center text-base leading-relaxed text-gray-600 dark:text-gray-400 px-8`}
                >
                  Start an event to see fans in your queue
                </Text>
              </View>
            </View>
          )}

          {activeTab === "analytics" && (
            <View style={tw`pb-6`}>
              {/* Empty State */}
              <View style={tw`items-center py-16`}>
                <View
                  style={tw`mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900`}
                >
                  <Text style={tw`text-4xl`}>📊</Text>
                </View>
                <Text
                  style={tw`mb-2 text-center text-2xl font-bold text-gray-900 dark:text-gray-50`}
                >
                  No Analytics Yet
                </Text>
                <Text
                  style={tw`text-center text-base leading-relaxed text-gray-600 dark:text-gray-400 px-8`}
                >
                  Analytics will appear here once you have event data
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Actions FAB */}
        <View style={tw`absolute bottom-6 right-6`}>
          <Pressable
            onPress={handleCreateEventClick}
            style={({ pressed }) => [
              tw`h-16 w-16 rounded-full bg-[#E91E63] items-center justify-center shadow-2xl`,
              {
                opacity: pressed ? 0.9 : canCreateEvents === false ? 0.5 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
          >
            <Text style={tw`text-3xl text-white dark:text-gray-950`}>+</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
