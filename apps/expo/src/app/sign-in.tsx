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
import { api, useConvexMutation } from "~/utils/convex";

export default function SignInScreen() {
  const router = useRouter();
  const createOrUpdateUser = useConvexMutation(api.users.createOrUpdateUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async () => {
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      // Sync user to Convex database
      if (result.data?.user) {
        await createOrUpdateUser({
          email: result.data.user.email,
          name: result.data.user.name,
          userType: (result.data.user as any).userType || "fan",
          authUserId: result.data.user.id,
        });
      }

      // Navigate to home which will redirect based on user type
      router.replace("/");
    } catch (error) {
      console.error("Auth error:", error);
      Alert.alert("Error", "Sign in failed. Please check your credentials.");
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white dark:bg-black`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
      >
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`flex-1 px-6 py-12`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={tw`flex-1 justify-between`}>
            {/* Header */}
            <View>
              <View style={tw`mb-12`}>
                <Text
                  style={tw`text-6xl font-black text-black dark:text-white mb-3`}
                >
                  Welcome
                </Text>
                <Text style={tw`text-6xl font-black text-[#E91E63]`}>Back</Text>
                <Text style={tw`text-lg text-gray-600 dark:text-gray-400 mt-4`}>
                  Sign in to continue
                </Text>
              </View>

              {/* Form */}
              <View>
                <View style={tw`mb-5`}>
                  <Text
                    style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2`}
                  >
                    EMAIL
                  </Text>
                  <TextInput
                    style={tw`bg-gray-100 dark:bg-gray-900 text-black dark:text-white rounded-2xl px-5 h-14 text-lg border-2 border-transparent`}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor={tw.color("gray-400")}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={tw`mb-8`}>
                  <Text
                    style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2`}
                  >
                    PASSWORD
                  </Text>
                  <TextInput
                    style={tw`bg-gray-100 dark:bg-gray-900 text-black dark:text-white rounded-2xl px-5 h-14 text-lg border-2 border-transparent`}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor={tw.color("gray-400")}
                    secureTextEntry
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </View>

                <Pressable
                  onPress={handleSignIn}
                  disabled={!email || !password}
                  style={({ pressed }) => [
                    tw`bg-[#E91E63] rounded-2xl py-6 shadow-lg`,
                    {
                      opacity: pressed ? 0.9 : !email || !password ? 0.4 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                >
                  <Text style={tw`text-white text-center text-xl font-bold`}>
                    Sign In
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Bottom */}
            <View style={tw`items-center py-6`}>
              <Pressable onPress={() => router.push("/sign-up")}>
                <Text style={tw`text-gray-600 dark:text-gray-400 text-base`}>
                  Don't have an account?{" "}
                  <Text style={tw`text-[#E91E63] font-bold`}>Sign up</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
