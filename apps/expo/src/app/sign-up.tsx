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

export default function SignUpScreen() {
  const router = useRouter();
  const createOrUpdateUser = useConvexMutation(api.users.createOrUpdateUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"fan" | "celebrity">("fan");

  const handleSignUp = async () => {
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });

      // Create the user in Convex database
      if (result.data?.user) {
        await createOrUpdateUser({
          email: result.data.user.email,
          name: result.data.user.name,
          userType: userType,
          authUserId: result.data.user.id,
        });
      }

      // Navigate to home which will redirect based on user type
      router.replace("/");
    } catch (error) {
      console.error("Auth error:", error);
      Alert.alert("Error", "Sign up failed. Please try again.");
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
          contentContainerStyle={tw`px-6 py-8`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={tw`mb-10`}>
            <Text
              style={tw`text-6xl font-black text-black dark:text-white mb-3`}
            >
              Join
            </Text>
            <Text style={tw`text-6xl font-black text-[#E91E63]`}>
              Fan Front
            </Text>
            <Text style={tw`text-lg text-gray-600 dark:text-gray-400 mt-4`}>
              Skip the line. Get access.
            </Text>
          </View>

          {/* Form */}
          <View style={tw`mb-8`}>
            {/* Name Input */}
            <View style={tw`mb-5`}>
              <Text
                style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2`}
              >
                FULL NAME
              </Text>
              <TextInput
                style={tw`bg-gray-100 dark:bg-gray-900 text-black dark:text-white rounded-2xl px-5 h-14 text-lg border-2 border-transparent`}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={tw.color("gray-400")}
                autoCorrect={false}
                autoCapitalize="words"
              />
            </View>

            {/* Email Input */}
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

            {/* Password Input */}
            <View style={tw`mb-6`}>
              <Text
                style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2`}
              >
                PASSWORD
              </Text>
              <TextInput
                style={tw`bg-gray-100 dark:bg-gray-900 text-black dark:text-white rounded-2xl px-5 h-14 text-lg border-2 border-transparent`}
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                placeholderTextColor={tw.color("gray-400")}
                secureTextEntry
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            {/* User Type Selection */}
            <View style={tw`mb-8`}>
              <Text
                style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3`}
              >
                I AM A
              </Text>
              <View style={tw`flex-row gap-3`}>
                <Pressable
                  onPress={() => setUserType("fan")}
                  style={[
                    tw`flex-1 rounded-2xl py-6 border-2`,
                    userType === "fan"
                      ? tw`bg-[#E91E63] border-[#E91E63]`
                      : tw`bg-transparent border-gray-300 dark:border-gray-700`,
                  ]}
                >
                  <Text
                    style={[
                      tw`text-center text-lg font-bold`,
                      userType === "fan"
                        ? tw`text-white`
                        : tw`text-gray-700 dark:text-gray-300`,
                    ]}
                  >
                    🎉 Fan
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setUserType("celebrity")}
                  style={[
                    tw`flex-1 rounded-2xl py-6 border-2`,
                    userType === "celebrity"
                      ? tw`bg-[#E91E63] border-[#E91E63]`
                      : tw`bg-transparent border-gray-300 dark:border-gray-700`,
                  ]}
                >
                  <Text
                    style={[
                      tw`text-center text-lg font-bold`,
                      userType === "celebrity"
                        ? tw`text-white`
                        : tw`text-gray-700 dark:text-gray-300`,
                    ]}
                  >
                    ⭐ Creator
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Continue Button */}
            <Pressable
              onPress={handleSignUp}
              disabled={!name || !email || !password}
              style={({ pressed }) => [
                tw`bg-[#E91E63] rounded-2xl py-6 shadow-lg`,
                {
                  opacity: pressed
                    ? 0.9
                    : !name || !email || !password
                      ? 0.4
                      : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Text style={tw`text-white text-center text-xl font-bold`}>
                Create Account
              </Text>
            </Pressable>
          </View>

          {/* Bottom */}
          <View style={tw`items-center py-6`}>
            <Pressable onPress={() => router.back()}>
              <Text style={tw`text-gray-600 dark:text-gray-400 text-base`}>
                Already have an account?{" "}
                <Text style={tw`text-[#E91E63] font-bold`}>Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
