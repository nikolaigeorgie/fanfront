import { useCallback, useState } from "react";
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
import { AvoidSoftInput } from "react-native-avoid-softinput";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import tw from "twrnc";

import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

export default function SignUpScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateUserType = useMutation(
    trpc.auth.updateUserType.mutationOptions({
      onSuccess: async () => {
        // Invalidate user queries to ensure fresh data on redirect
        await queryClient.invalidateQueries(trpc.auth.pathFilter());
      },
    }),
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"fan" | "celebrity">("fan");

  const onFocusEffect = useCallback(() => {
    AvoidSoftInput.setShouldMimicIOSBehavior(true);
    AvoidSoftInput.setEnabled(true);
    return () => {
      AvoidSoftInput.setEnabled(false);
      AvoidSoftInput.setShouldMimicIOSBehavior(false);
    };
  }, []);

  useFocusEffect(onFocusEffect);

  const handleSignUp = async () => {
    try {
      console.log("=== SIGN UP START ===");
      console.log("Selected userType:", userType);

      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });

      console.log("Sign up result:", result.data?.user);

      // Update user type in database after account creation
      if (result.data?.user) {
        console.log("=== UPDATING USER TYPE ===");
        console.log("Updating to:", userType);

        const mutationResult = await updateUserType.mutateAsync({ userType });
        console.log("Mutation result:", mutationResult);

        // Wait a bit longer to ensure database write completes
        // (tRPC has artificial delay in dev mode)
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Force clear any cached queries
        queryClient.clear();

        console.log("=== UPDATE COMPLETE ===");
      }

      console.log("=== REDIRECTING ===");
      // Navigate to home which will redirect based on user type
      router.replace("/");
    } catch (error) {
      console.error("=== SIGN UP ERROR ===", error);
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
