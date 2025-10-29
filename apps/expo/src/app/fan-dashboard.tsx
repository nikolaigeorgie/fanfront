import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import tw from "twrnc";

import { EventScannerModal } from "~/components/EventScannerModal";
import { QueueSuccessModal } from "~/components/QueueSuccessModal";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

export default function FanDashboard() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [showEventScanner, setShowEventScanner] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    event: any;
    queueData: any;
  } | null>(null);

  // Get user data from PostgreSQL via tRPC
  const { data: user } = useQuery(trpc.auth.getCurrentUser.queryOptions());

  // TODO: Integrate with Convex for queue entries
  const getUserQueueEntries: any[] = []; // Will be integrated with Convex

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoading(false);
        return;
      }

      try {
        let location = await Location.getCurrentPositionAsync({});
        setLocation(location);
      } catch (error) {
        console.log("Location error:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={tw`flex-1 bg-white dark:bg-gray-950`}>
      <SafeAreaView style={tw`flex-1`}>
        {/* Header */}
        <View style={tw`px-6 pt-4 pb-2`}>
          <View style={tw`flex-row items-center justify-between`}>
            <Text
              style={tw`text-2xl font-bold text-gray-900 dark:text-gray-50`}
            >
              Fan<Text style={tw`text-[#E91E63]`}>Front</Text>
            </Text>
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
        </View>

        {/* Map Section */}
        <View style={tw`mx-6 mb-6`}>
          <View
            style={tw`overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900`}
          >
            <View style={tw`relative h-48`}>
              {/* Map placeholder */}
              <View
                style={tw`absolute inset-0 items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950`}
              >
                <View style={tw`items-center`}>
                  <Text style={tw`mb-2 text-4xl`}>🗺️</Text>
                  <Text
                    style={tw`font-medium text-gray-700 dark:text-gray-300`}
                  >
                    Your Location
                  </Text>
                  <Text style={tw`text-sm text-gray-500 dark:text-gray-400`}>
                    Map integration coming soon
                  </Text>
                </View>
              </View>

              {/* Location info overlay */}
              {location && (
                <View
                  style={tw`absolute top-4 left-4 rounded-lg bg-gray-900/80 dark:bg-gray-950/80 px-3 py-2`}
                >
                  <Text style={tw`text-xs text-gray-50`}>
                    📍 {location.coords.latitude.toFixed(4)},{" "}
                    {location.coords.longitude.toFixed(4)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Queue Status or Empty State */}
        {getUserQueueEntries && getUserQueueEntries.length > 0 ? (
          <ScrollView style={tw`flex-1 px-6`}>
            <Text
              style={tw`mb-4 text-xl font-semibold text-gray-900 dark:text-gray-50`}
            >
              Your Queue
            </Text>
            {/* Queue entries will be rendered here when Convex is integrated */}
          </ScrollView>
        ) : (
          /* Empty State - Event Discovery */
          <View style={tw`flex-1 justify-center px-6`}>
            <View style={tw`mb-8 items-center`}>
              <View
                style={tw`mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900`}
              >
                <Text style={tw`text-4xl`}>🎫</Text>
              </View>
              <Text
                style={tw`mb-2 text-center text-2xl font-bold text-gray-900 dark:text-gray-50`}
              >
                Discover Events
              </Text>
              <Text
                style={tw`text-center text-base leading-relaxed text-gray-600 dark:text-gray-400`}
              >
                Scan a QR code at any event kiosk or enter an event code to join
                the queue
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={tw`gap-4`}>
              <Pressable
                style={({ pressed }) => [
                  tw`rounded-2xl bg-[#E91E63] px-6 py-4`,
                  {
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
                onPress={() => setShowEventScanner(true)}
              >
                <View style={tw`flex-row items-center justify-center`}>
                  <Text
                    style={tw`mr-2 text-lg font-semibold text-white dark:text-gray-950`}
                  >
                    📱
                  </Text>
                  <Text
                    style={tw`text-lg font-semibold text-white dark:text-gray-950`}
                  >
                    Scan QR Code
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  tw`rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 px-6 py-4`,
                  {
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
                onPress={() => setShowEventScanner(true)}
              >
                <View style={tw`flex-row items-center justify-center`}>
                  <Text
                    style={tw`mr-2 text-lg font-semibold text-gray-900 dark:text-gray-50`}
                  >
                    🔢
                  </Text>
                  <Text
                    style={tw`text-lg font-semibold text-gray-900 dark:text-gray-50`}
                  >
                    Enter Event Code
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        )}

        {/* Event Scanner Modal */}
        {session?.user?.id && (
          <EventScannerModal
            visible={showEventScanner}
            onClose={() => setShowEventScanner(false)}
            onSuccess={(event, queueData) => {
              setSuccessData({ event, queueData });
              setShowSuccessModal(true);
            }}
            userId={session.user.id}
          />
        )}

        {/* Success Modal */}
        <QueueSuccessModal
          visible={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setSuccessData(null);
          }}
          event={successData?.event}
          queuePosition={successData?.queueData?.position}
          estimatedTime={successData?.queueData?.estimatedTime}
        />
      </SafeAreaView>
    </View>
  );
}
