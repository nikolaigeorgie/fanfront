import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import tw from "twrnc";

import { authClient } from "~/utils/auth";
import { api, useConvexMutation, useConvexQuery } from "~/utils/convex";

export default function CreateEventScreen() {
  const router = useRouter();
  const createEvent = useConvexMutation(api.events.createEvent);
  const createOrUpdateUser = useConvexMutation(api.users.createOrUpdateUser);
  const { data: session } = authClient.useSession();

  // Get Convex user by auth ID
  const convexUser = useConvexQuery(
    api.users.getUserByAuthId,
    session?.user?.id ? { authUserId: session.user.id } : "skip",
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [slotDuration, setSlotDuration] = useState("15");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateEvent = async () => {
    if (!session?.user?.id) {
      Alert.alert("Error", "You must be signed in to create events");
      return;
    }

    // If Convex user doesn't exist, create it
    let userId: any = convexUser?._id;
    if (!userId) {
      try {
        userId = await createOrUpdateUser({
          email: session.user.email,
          name: session.user.name,
          userType: (session.user as any).userType || "celebrity",
          authUserId: session.user.id,
        });
        
        if (!userId) {
          Alert.alert("Error", "Failed to create user account. Please try again.");
          return;
        }
      } catch (error) {
        console.error("Failed to create user:", error);
        Alert.alert("Error", "Failed to sync user account. Please try again.");
        return;
      }
    }

    // Validation
    if (!title.trim()) {
      Alert.alert("Error", "Please enter an event title");
      return;
    }
    if (!location.trim()) {
      Alert.alert("Error", "Please enter a location");
      return;
    }
    if (!startTime.trim() || !endTime.trim()) {
      Alert.alert("Error", "Please enter start and end times");
      return;
    }

    try {
      setIsSubmitting(true);

      // Parse times (format: HH:MM)
      const parseTime = (timeStr: string, baseDate: Date) => {
        const parts = timeStr.split(":").map(Number);
        const hours = parts[0] ?? 0;
        const minutes = parts[1] ?? 0;
        const date = new Date(baseDate);
        date.setHours(hours, minutes, 0, 0);
        return date.getTime();
      };

      const now = new Date();
      const startTimeMs = parseTime(startTime, now);
      const endTimeMs = parseTime(endTime, now);

      // Calculate max duration in minutes
      const maxDuration = Math.floor((endTimeMs - startTimeMs) / (1000 * 60));

      if (maxDuration <= 0) {
        Alert.alert("Error", "End time must be after start time");
        return;
      }

      await createEvent({
        title: title.trim(),
        description: description.trim(),
        celebrityId: userId!,
        location: location.trim(),
        startTime: startTimeMs,
        endTime: endTimeMs,
        maxDuration,
        slotDuration: parseInt(slotDuration),
        maxCapacity: maxCapacity ? parseInt(maxCapacity) : undefined,
      });

      Alert.alert("Success", "Event created successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Create event error:", error);
      Alert.alert("Error", "Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={tw`flex-1 bg-white dark:bg-gray-950`}>
      <SafeAreaView style={tw`flex-1`}>
        {/* Header */}
        <View
          style={tw`px-6 py-4 border-b border-gray-200 dark:border-gray-800`}
        >
          <View style={tw`flex-row items-center justify-between`}>
            <Pressable onPress={() => router.back()}>
              <Text style={tw`text-[#E91E63] text-lg font-semibold`}>
                Cancel
              </Text>
            </Pressable>
            <Text style={tw`text-xl font-bold text-gray-900 dark:text-gray-50`}>
              Create Event
            </Text>
            <View style={tw`w-16`} />
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={tw`flex-1`}
        >
          <ScrollView
            style={tw`flex-1`}
            contentContainerStyle={tw`px-6 py-6`}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Event Title */}
            <View style={tw`mb-5`}>
              <Text
                style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2`}
              >
                EVENT TITLE *
              </Text>
              <TextInput
                style={tw`bg-gray-100 dark:bg-gray-900 text-black dark:text-white rounded-2xl px-5 h-14 text-lg border-2 border-transparent focus:border-[#E91E63]`}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Meet & Greet at Comic Con"
                placeholderTextColor={tw.color("gray-400")}
                autoCorrect={false}
              />
            </View>

            {/* Description */}
            <View style={tw`mb-5`}>
              <Text
                style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2`}
              >
                DESCRIPTION
              </Text>
              <TextInput
                style={tw`bg-gray-100 dark:bg-gray-900 text-black dark:text-white rounded-2xl px-5 py-4 text-base border-2 border-transparent focus:border-[#E91E63]`}
                value={description}
                onChangeText={setDescription}
                placeholder="Tell fans what to expect..."
                placeholderTextColor={tw.color("gray-400")}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Location */}
            <View style={tw`mb-5`}>
              <Text
                style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2`}
              >
                LOCATION *
              </Text>
              <TextInput
                style={tw`bg-gray-100 dark:bg-gray-900 text-black dark:text-white rounded-2xl px-5 h-14 text-lg border-2 border-transparent focus:border-[#E91E63]`}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g., Booth 215, Hall A"
                placeholderTextColor={tw.color("gray-400")}
                autoCorrect={false}
              />
            </View>

            {/* Time Range */}
            <View style={tw`mb-5`}>
              <Text
                style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2`}
              >
                EVENT TIME *
              </Text>
              <View style={tw`flex-row gap-3`}>
                <View style={tw`flex-1`}>
                  <Text
                    style={tw`text-xs text-gray-500 dark:text-gray-400 mb-1`}
                  >
                    Start Time
                  </Text>
                  <TextInput
                    style={tw`bg-gray-100 dark:bg-gray-900 text-black dark:text-white rounded-2xl px-5 h-14 text-lg border-2 border-transparent focus:border-[#E91E63]`}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="14:00"
                    placeholderTextColor={tw.color("gray-400")}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={tw`flex-1`}>
                  <Text
                    style={tw`text-xs text-gray-500 dark:text-gray-400 mb-1`}
                  >
                    End Time
                  </Text>
                  <TextInput
                    style={tw`bg-gray-100 dark:bg-gray-900 text-black dark:text-white rounded-2xl px-5 h-14 text-lg border-2 border-transparent focus:border-[#E91E63]`}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="18:00"
                    placeholderTextColor={tw.color("gray-400")}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
              <Text style={tw`text-xs text-gray-500 dark:text-gray-400 mt-1`}>
                Use 24-hour format (HH:MM)
              </Text>
            </View>

            {/* Slot Configuration */}
            <View style={tw`mb-5`}>
              <Text
                style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2`}
              >
                SLOT DURATION (MINUTES) *
              </Text>
              <TextInput
                style={tw`bg-gray-100 dark:bg-gray-900 text-black dark:text-white rounded-2xl px-5 h-14 text-lg border-2 border-transparent focus:border-[#E91E63]`}
                value={slotDuration}
                onChangeText={setSlotDuration}
                placeholder="15"
                placeholderTextColor={tw.color("gray-400")}
                keyboardType="number-pad"
              />
              <Text style={tw`text-xs text-gray-500 dark:text-gray-400 mt-1`}>
                How long each fan interaction will take
              </Text>
            </View>

            {/* Max Capacity */}
            <View style={tw`mb-5`}>
              <Text
                style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2`}
              >
                MAX CAPACITY (OPTIONAL)
              </Text>
              <TextInput
                style={tw`bg-gray-100 dark:bg-gray-900 text-black dark:text-white rounded-2xl px-5 h-14 text-lg border-2 border-transparent focus:border-[#E91E63]`}
                value={maxCapacity}
                onChangeText={setMaxCapacity}
                placeholder="Auto-calculated if not set"
                placeholderTextColor={tw.color("gray-400")}
                keyboardType="number-pad"
              />
              <Text style={tw`text-xs text-gray-500 dark:text-gray-400 mt-1`}>
                Maximum number of fans in queue
              </Text>
            </View>

            {/* Info Box */}
            <View
              style={tw`bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-4 mb-6`}
            >
              <Text
                style={tw`text-sm text-blue-900 dark:text-blue-100 leading-relaxed`}
              >
                💡 Fans will scan a QR code to join your queue. They'll receive
                real-time updates on their position and estimated wait time.
              </Text>
            </View>

            {/* Create Button */}
            <Pressable
              onPress={handleCreateEvent}
              disabled={isSubmitting}
              style={({ pressed }) => [
                tw`bg-[#E91E63] rounded-2xl py-4 mb-6`,
                {
                  opacity: pressed ? 0.9 : isSubmitting ? 0.5 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Text style={tw`text-white text-center text-lg font-bold`}>
                {isSubmitting ? "Creating..." : "Create Event"}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
