import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useMutation, useQuery } from "convex/react";

import { EventScannerModal } from "~/components/EventScannerModal";
import { QueueSuccessModal } from "~/components/QueueSuccessModal";
import { authClient } from "~/utils/auth";
import { api } from "../../convex/_generated/api";

function MobileAuth({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [userType, setUserType] = useState<"fan" | "celebrity">("fan");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    try {
      if (isSignUp) {
        await authClient.signUp.email({
          email,
          password,
          name,
        });
      } else {
        await authClient.signIn.email({
          email,
          password,
        });
      }
      // Clear form and close modal
      setEmail("");
      setPassword("");
      setName("");
      onClose();
    } catch (error) {
      console.error("Auth error:", error);
      Alert.alert("Error", "Authentication failed. Please try again.");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View className="flex-1 bg-black">
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="border-b border-white/10 px-6 py-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-semibold text-white">
                {isSignUp ? "Sign Up" : "Sign In"}
              </Text>
              <Pressable onPress={onClose}>
                <Text className="text-lg text-blue-400">Close</Text>
              </Pressable>
            </View>
          </View>

          {/* Form */}
          <ScrollView className="flex-1 px-6 py-8">
            <View className="space-y-6">
              {isSignUp && (
                <>
                  <View>
                    <Text className="mb-2 text-sm font-medium text-white">
                      Name
                    </Text>
                    <TextInput
                      className="rounded-2xl border border-white/20 bg-gray-800/50 px-4 py-4 text-lg text-white"
                      value={name}
                      onChangeText={setName}
                      placeholder="Your name"
                      placeholderTextColor="#ffffff60"
                    />
                  </View>

                  <View>
                    <Text className="mb-2 text-sm font-medium text-white">
                      I am a:
                    </Text>
                    <View className="flex-row space-x-3">
                      <Pressable
                        onPress={() => setUserType("fan")}
                        className={`flex-1 rounded-2xl border px-4 py-4 ${
                          userType === "fan"
                            ? "border-blue-400 bg-blue-600/20"
                            : "border-white/20 bg-gray-800/50"
                        }`}
                      >
                        <Text
                          className={`text-center font-medium ${
                            userType === "fan" ? "text-blue-400" : "text-white"
                          }`}
                        >
                          Fan
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setUserType("celebrity")}
                        className={`flex-1 rounded-2xl border px-4 py-4 ${
                          userType === "celebrity"
                            ? "border-blue-400 bg-blue-600/20"
                            : "border-white/20 bg-gray-800/50"
                        }`}
                      >
                        <Text
                          className={`text-center font-medium ${
                            userType === "celebrity"
                              ? "text-blue-400"
                              : "text-white"
                          }`}
                        >
                          Celebrity/Creator
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              )}

              <View>
                <Text className="mb-2 text-sm font-medium text-white">
                  Email
                </Text>
                <TextInput
                  className="rounded-2xl border border-white/20 bg-gray-800/50 px-4 py-4 text-lg text-white"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor="#ffffff60"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-white">
                  Password
                </Text>
                <TextInput
                  className="rounded-2xl border border-white/20 bg-gray-800/50 px-4 py-4 text-lg text-white"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#ffffff60"
                  secureTextEntry
                />
              </View>

              <Pressable
                onPress={handleAuth}
                className="mt-4 rounded-2xl bg-blue-600 px-6 py-4"
              >
                <Text className="text-center text-lg font-semibold text-white">
                  {isSignUp ? "Sign Up" : "Sign In"}
                </Text>
              </Pressable>

              <Pressable onPress={() => setIsSignUp(!isSignUp)}>
                <Text className="text-center text-blue-400">
                  {isSignUp
                    ? "Already have an account? Sign In"
                    : "Don't have an account? Sign Up"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function MobileDashboard({ session }: { session: any }) {
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

  // Get or create user in Convex
  const user = useQuery(api.users.getUserByEmail, {
    email: session.user.email,
  });
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);
  const getUserQueueEntries = useQuery(
    api.queue.getUserQueueEntries,
    user ? { userId: user._id } : "skip",
  );

  // Create user in Convex if doesn't exist
  const [userCreated, setUserCreated] = useState(false);

  useEffect(() => {
    if (session?.user?.email && !user && !userCreated) {
      setUserCreated(true);
      createOrUpdateUser({
        email: session.user.email,
        name: session.user.name || session.user.email,
        userType: "fan", // Default to fan, they can change later
        authUserId: session.user.id,
      });
    }
  }, [session?.user?.email, user, userCreated, createOrUpdateUser]);

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
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-white">
              Fan<Text className="text-blue-400">Front</Text>
            </Text>
            <Pressable
              onPress={() => authClient.signOut()}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm"
            >
              <Text className="text-sm text-white">Sign Out</Text>
            </Pressable>
          </View>
        </View>

        {/* Map Section */}
        <View className="mx-6 mb-6">
          <View className="overflow-hidden rounded-2xl border border-white/10 bg-gray-900/50 backdrop-blur-sm">
            <View className="relative h-48 bg-gradient-to-br from-blue-900/30 to-purple-900/30">
              {/* Map placeholder */}
              <View className="absolute inset-0 items-center justify-center">
                <View className="items-center">
                  <Text className="mb-2 text-4xl text-white">🗺️</Text>
                  <Text className="font-medium text-white/80">
                    Your Location
                  </Text>
                  <Text className="text-sm text-white/60">
                    Map integration coming soon
                  </Text>
                </View>
              </View>

              {/* Location info overlay */}
              {location && (
                <View className="absolute top-4 left-4 rounded-lg bg-black/50 px-3 py-2 backdrop-blur-sm">
                  <Text className="text-xs text-white">
                    📍 {location.coords.latitude.toFixed(4)},{" "}
                    {location.coords.longitude.toFixed(4)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Queue Status */}
        {getUserQueueEntries && getUserQueueEntries.length > 0 ? (
          <ScrollView className="flex-1 px-6">
            <Text className="mb-4 text-xl font-semibold text-white">
              Your Queue
            </Text>
            {getUserQueueEntries.map((entry: any) => (
              <View
                key={entry._id}
                className="mb-4 rounded-2xl border border-white/10 bg-gray-900/50 p-6 backdrop-blur-sm"
              >
                {/* Ticket-like design */}
                <View className="mb-4 flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-white">
                      {entry.event?.title}
                    </Text>
                    <Text className="text-sm text-white/70">
                      with {entry.celebrity?.name}
                    </Text>
                  </View>
                  <View className="rounded-lg bg-blue-600 px-3 py-1">
                    <Text className="text-sm font-semibold text-white">
                      #{entry.position}
                    </Text>
                  </View>
                </View>

                <View className="border-t border-white/10 pt-4">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-xs tracking-wide text-white/60 uppercase">
                        STATUS
                      </Text>
                      <Text className="text-sm font-medium text-white capitalize">
                        {entry.status}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-xs tracking-wide text-white/60 uppercase">
                        EST. TIME
                      </Text>
                      <Text className="text-sm font-medium text-white">
                        {new Date(entry.estimatedTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          /* Empty State - Event Discovery */
          <View className="flex-1 justify-center px-6">
            <View className="mb-8 items-center">
              <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-800/50">
                <Text className="text-4xl">🎫</Text>
              </View>
              <Text className="mb-2 text-center text-2xl font-bold text-white">
                Discover Events
              </Text>
              <Text className="text-center text-base leading-relaxed text-white/70">
                Scan a QR code at any event kiosk or enter an event code to join
                the queue
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="space-y-4">
              <Pressable
                className="rounded-2xl bg-blue-600 px-6 py-4"
                onPress={() => setShowEventScanner(true)}
              >
                <View className="flex-row items-center justify-center">
                  <Text className="mr-2 text-lg font-semibold text-white">
                    📱
                  </Text>
                  <Text className="text-lg font-semibold text-white">
                    Scan QR Code
                  </Text>
                </View>
              </Pressable>

              <Pressable
                className="rounded-2xl border border-white/10 bg-gray-800/50 px-6 py-4 backdrop-blur-sm"
                onPress={() => setShowEventScanner(true)}
              >
                <View className="flex-row items-center justify-center">
                  <Text className="mr-2 text-lg font-semibold text-white">
                    🔢
                  </Text>
                  <Text className="text-lg font-semibold text-white">
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
          userId={user?._id}
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

export default function Index() {
  const { data: session, isPending } = authClient.useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Show loading state while checking session
  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">Loading...</Text>
      </View>
    );
  }

  // If user is authenticated, show dashboard
  if (session) {
    return <MobileDashboard session={session} />;
  }

  // Show landing page for unauthenticated users
  return (
    <View className="flex-1 bg-black">
      {/* Background with gradient */}
      <View className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-black" />

      {/* Animated background elements */}
      <View className="absolute inset-0">
        <View className="absolute top-20 left-4 h-16 w-16 rotate-12 rounded-lg bg-blue-500/10" />
        <View className="absolute top-32 right-8 h-12 w-12 -rotate-6 rounded-lg bg-purple-500/10" />
        <View className="absolute top-64 left-12 h-8 w-8 rotate-45 rounded-lg bg-blue-400/10" />
        <View className="absolute right-4 bottom-40 h-20 w-20 -rotate-12 rounded-lg bg-purple-400/10" />
        <View className="absolute bottom-64 left-6 h-14 w-14 rotate-6 rounded-lg bg-blue-300/10" />
      </View>

      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-6 pt-4 pb-8">
          <View className="flex-row items-center justify-between">
            <View className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              <Text className="text-sm font-medium text-white">BETA</Text>
            </View>
            <View className="flex-row space-x-4">
              <Text className="text-sm text-white/70">SIGN UP</Text>
              <Text className="text-sm font-medium text-white">LOGIN</Text>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View className="flex-1 px-6">
          {/* Hero */}
          <View className="mb-12">
            <Text className="mb-4 text-5xl leading-tight font-bold text-white">
              Fan<Text className="text-blue-400">Front</Text> is here
            </Text>

            {/* Countdown-style info */}
            <View className="mb-6 flex-row items-center space-x-6">
              <View className="items-center">
                <Text className="text-2xl font-bold text-white">∞</Text>
                <Text className="text-xs tracking-wide text-white/60 uppercase">
                  EVENTS
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-white">0</Text>
                <Text className="text-xs tracking-wide text-white/60 uppercase">
                  QUEUES
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-white">∞</Text>
                <Text className="text-xs tracking-wide text-white/60 uppercase">
                  TIME SAVED
                </Text>
              </View>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-base font-medium tracking-wide text-white/80 uppercase">
                  SKIP THE LINE
                </Text>
                <Text className="text-base text-white/80">
                  RESERVE YOUR SPOT
                </Text>
              </View>

              <View className="flex-row items-center space-x-8">
                <View>
                  <Text className="text-sm tracking-wide text-white/60 uppercase">
                    DIGITAL QUEUES
                  </Text>
                  <Text className="text-lg font-semibold text-white">FREE</Text>
                </View>
                <View>
                  <Text className="text-sm tracking-wide text-white/60 uppercase">
                    REAL-TIME UPDATES
                  </Text>
                  <Text className="text-lg font-semibold text-white">
                    INCLUDED
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* CTA Button */}
          <View className="mb-8">
            <Pressable
              className="mb-4 rounded-lg bg-blue-600 px-6 py-4"
              onPress={() => setShowAuthModal(true)}
            >
              <Text className="text-center text-lg font-semibold text-white">
                Get Started
              </Text>
              <Text className="text-center text-sm text-blue-100">
                Join / Sign Up
              </Text>
            </Pressable>

            <Text className="text-center text-sm text-white/60">
              Already registered?{" "}
              <Text className="text-white underline">Log in here</Text>
            </Text>
          </View>
        </View>

        {/* Auth Modal - triggered by Get Started button */}
        <MobileAuth
          visible={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </SafeAreaView>
    </View>
  );
}
