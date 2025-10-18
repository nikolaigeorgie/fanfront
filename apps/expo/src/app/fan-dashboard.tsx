import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import tw from "twrnc";

import { EventScannerModal } from "~/components/EventScannerModal";
import { QueueSuccessModal } from "~/components/QueueSuccessModal";
import { authClient } from "~/utils/auth";

export default function FanDashboard() {
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
    <View style={tw`flex-1 bg-black`}>
      <SafeAreaView style={tw`flex-1`}>
        {/* Header */}
        <View style={tw`px-6 pt-4 pb-2`}>
          <View style={tw`flex-row items-center justify-between`}>
            <Text style={tw`text-2xl font-bold text-white`}>
              Fan<Text style={tw`text-[#E91E63]`}>Front</Text>
            </Text>
            <Pressable
              onPress={() => authClient.signOut()}
              style={tw`rounded-lg border border-white/20 bg-white/10 px-3 py-1.5`}
            >
              <Text style={tw`text-sm text-white`}>Sign Out</Text>
            </Pressable>
          </View>
        </View>

        {/* Map Section */}
        <View style={tw`mx-6 mb-6`}>
          <View
            style={tw`overflow-hidden rounded-2xl border border-white/10 bg-gray-900/50`}
          >
            <View style={tw`relative h-48`}>
              {/* Map placeholder */}
              <View
                style={tw`absolute inset-0 items-center justify-center bg-gradient-to-br from-blue-900/30 to-purple-900/30`}
              >
                <View style={tw`items-center`}>
                  <Text style={tw`mb-2 text-4xl text-white`}>🗺️</Text>
                  <Text style={tw`font-medium text-white/80`}>
                    Your Location
                  </Text>
                  <Text style={tw`text-sm text-white/60`}>
                    Map integration coming soon
                  </Text>
                </View>
              </View>

              {/* Location info overlay */}
              {location && (
                <View
                  style={tw`absolute top-4 left-4 rounded-lg bg-black/50 px-3 py-2`}
                >
                  <Text style={tw`text-xs text-white`}>
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
            <Text style={tw`mb-4 text-xl font-semibold text-white`}>
              Your Queue
            </Text>
            {/* Queue entries will be rendered here when Convex is integrated */}
          </ScrollView>
        ) : (
          /* Empty State - Event Discovery */
          <View style={tw`flex-1 justify-center px-6`}>
            <View style={tw`mb-8 items-center`}>
              <View
                style={tw`mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-800/50`}
              >
                <Text style={tw`text-4xl`}>🎫</Text>
              </View>
              <Text style={tw`mb-2 text-center text-2xl font-bold text-white`}>
                Discover Events
              </Text>
              <Text
                style={tw`text-center text-base leading-relaxed text-white/70`}
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
                  <Text style={tw`mr-2 text-lg font-semibold text-white`}>
                    📱
                  </Text>
                  <Text style={tw`text-lg font-semibold text-white`}>
                    Scan QR Code
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  tw`rounded-2xl border border-white/10 bg-gray-800/50 px-6 py-4`,
                  {
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
                onPress={() => setShowEventScanner(true)}
              >
                <View style={tw`flex-row items-center justify-center`}>
                  <Text style={tw`mr-2 text-lg font-semibold text-white`}>
                    🔢
                  </Text>
                  <Text style={tw`text-lg font-semibold text-white`}>
                    Enter Event Code
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        )}

        {/* Event Scanner Modal */}
        <EventScannerModal
          visible={showEventScanner}
          onClose={() => setShowEventScanner(false)}
          onSuccess={(event, queueData) => {
            setSuccessData({ event, queueData });
            setShowSuccessModal(true);
          }}
          userId={session?.user?.id}
        />

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
