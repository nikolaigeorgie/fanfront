import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import tw from "twrnc";

import { authClient } from "~/utils/auth";

export default function CreatorDashboard() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [activeTab, setActiveTab] = useState<"events" | "queue" | "analytics">(
    "events",
  );

  // TODO: Integrate with Convex for creator data
  const creatorEvents = []; // Will be integrated with Convex
  const activeQueues = []; // Will be integrated with Convex

  return (
    <View style={tw`flex-1 bg-white dark:bg-gray-950`}>
      <SafeAreaView style={tw`flex-1`}>
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
                0
              </Text>
            </View>
            <View
              style={tw`rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-6 py-4 min-w-40`}
            >
              <Text style={tw`text-sm text-gray-500 dark:text-gray-400 mb-1`}>
                In Queue
              </Text>
              <Text style={tw`text-3xl font-bold text-[#E91E63]`}>0</Text>
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
              {/* Empty State */}
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
                  Create your first event to start managing queues and engaging
                  with fans
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    tw`rounded-2xl bg-[#E91E63] px-8 py-4`,
                    {
                      opacity: pressed ? 0.9 : 1,
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
            style={({ pressed }) => [
              tw`h-16 w-16 rounded-full bg-[#E91E63] items-center justify-center shadow-2xl`,
              {
                opacity: pressed ? 0.9 : 1,
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
