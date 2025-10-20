import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { StripeProvider } from "@stripe/stripe-react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { ConvexProvider } from "convex/react";

import { queryClient } from "~/utils/api";

import "../styles.css";

import { convex } from "~/utils/convex";
import { STRIPE_CONFIG } from "~/utils/stripe";

// This is the main layout of the app
// It wraps your pages with the providers they need
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider
        publishableKey={STRIPE_CONFIG.publishableKey}
        merchantIdentifier={STRIPE_CONFIG.merchantIdentifier}
        urlScheme={STRIPE_CONFIG.urlScheme}
      >
        <ConvexProvider client={convex}>
          <QueryClientProvider client={queryClient}>
            {/*
          The Stack component displays the current page.
          It also allows you to configure your screens 
        */}
            <BottomSheetModalProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    headerStyle: {
                      backgroundColor: "#c03484",
                    },
                    contentStyle: {
                      backgroundColor:
                        colorScheme == "dark" ? "#09090B" : "#FFFFFF",
                    },
                  }}
                />
                <Stack.Screen
                  name="stripe-onboarding"
                  options={{
                    presentation: "modal",
                    headerShown: false,
                    gestureEnabled: false,
                  }}
                />
              </Stack>
            </BottomSheetModalProvider>
            <StatusBar />
          </QueryClientProvider>
        </ConvexProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
