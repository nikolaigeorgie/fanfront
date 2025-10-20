import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import tw from "twrnc";

export default function Landing() {
  const router = useRouter();

  return (
    <SafeAreaView style={tw`flex-1 bg-white dark:bg-black`}>
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`flex-1`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`flex-1 justify-between px-6 py-12`}>
          {/* Hero Section */}
          <View style={tw`flex-1 justify-center`}>
            <View style={tw`mb-16`}>
              {/* Brand Name */}
              <View style={tw`mb-8`}>
                <Text
                  style={tw`text-7xl font-black text-black dark:text-white leading-tight`}
                >
                  Fan
                </Text>
                <Text
                  style={tw`text-7xl font-black text-[#E91E63] leading-tight`}
                >
                  Front
                </Text>
              </View>

              {/* Tagline */}
              <View style={tw`mb-6`}>
                <Text
                  style={tw`text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3`}
                >
                  Your events, reimagined
                </Text>
                <Text
                  style={tw`text-lg text-gray-600 dark:text-gray-400 leading-relaxed`}
                >
                  Seamlessly manage event access, scan tickets, and connect with
                  your audience—all in one powerful platform.
                </Text>
              </View>

              {/* Features Pills */}
              <View style={tw`flex-row flex-wrap gap-2 mb-4`}>
                <View
                  style={tw`bg-gray-100 dark:bg-gray-900 px-4 py-2 rounded-full`}
                >
                  <Text
                    style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300`}
                  >
                    ⚡ Instant Scanning
                  </Text>
                </View>
                <View
                  style={tw`bg-gray-100 dark:bg-gray-900 px-4 py-2 rounded-full`}
                >
                  <Text
                    style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300`}
                  >
                    🎫 Smart Queuing
                  </Text>
                </View>
                <View
                  style={tw`bg-gray-100 dark:bg-gray-900 px-4 py-2 rounded-full`}
                >
                  <Text
                    style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300`}
                  >
                    📊 Real-time Analytics
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* CTA Buttons */}
          <View style={tw`gap-4 pb-6`}>
            {/* Sign Up Button - Primary */}
            <Pressable
              onPress={() => router.push("/sign-up")}
              style={({ pressed }) => [
                tw`bg-[#E91E63] rounded-2xl py-6 shadow-xl`,
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Text style={tw`text-white text-center text-xl font-bold`}>
                Get Started
              </Text>
            </Pressable>

            {/* Sign In Button - Secondary */}
            <Pressable
              onPress={() => router.push("/sign-in")}
              style={({ pressed }) => [
                tw`bg-gray-100 dark:bg-gray-900 rounded-2xl py-6 border-2 border-gray-200 dark:border-gray-800`,
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Text
                style={tw`text-gray-900 dark:text-white text-center text-xl font-bold`}
              >
                Sign In
              </Text>
            </Pressable>

            {/* Footer Text */}
            <Text
              style={tw`text-center text-sm text-gray-500 dark:text-gray-500 mt-4`}
            >
              Join thousands of event organizers worldwide
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
