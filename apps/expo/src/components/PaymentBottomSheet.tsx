import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { CardField, useStripe } from "@stripe/stripe-react-native";
import { useAction } from "convex/react";
import tw from "twrnc";

import { api } from "../../convex/_generated/api";

interface PaymentBottomSheetProps {
  event: {
    _id: string;
    title: string;
    celebrity?: { name: string };
    location: string;
    price?: number;
    slotDuration: number;
  };
  userId: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

export interface PaymentBottomSheetRef {
  present: () => void;
}

export const PaymentBottomSheet = forwardRef<
  PaymentBottomSheetRef,
  PaymentBottomSheetProps
>(({ event, userId, onSuccess, onCancel }, ref) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["75%", "90%"], []);
  const { confirmPayment } = useStripe();
  const createPaymentIntent = useAction(api.payments.createPaymentIntent);

  const [isProcessing, setIsProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  // Default price to $10 if not set (in cents)
  const priceInCents = event.price || 1000;
  const priceInDollars = (priceInCents / 100).toFixed(2);

  const handleOpen = useCallback(() => {
    bottomSheetRef.current?.present();
  }, []);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
    onCancel();
  }, [onCancel]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.7}
        pressBehavior="none"
      />
    ),
    [],
  );

  const handlePayment = async () => {
    if (!cardComplete) {
      Alert.alert("Error", "Please complete your card details");
      return;
    }

    try {
      setIsProcessing(true);

      // Create payment intent via Convex action
      const { clientSecret, paymentIntentId } = await createPaymentIntent({
        eventId: event._id as any,
        userId: userId as any,
      });

      // Confirm the payment with Stripe
      const { error, paymentIntent } = await confirmPayment(clientSecret, {
        paymentMethodType: "Card",
      });

      if (error) {
        Alert.alert("Payment Failed", error.message);
        setIsProcessing(false);
        return;
      }

      if (paymentIntent) {
        // Payment successful
        handleClose();
        onSuccess(paymentIntentId);
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      Alert.alert("Error", "Payment failed. Please try again.");
      setIsProcessing(false);
    }
  };

  // Expose open method via ref
  useImperativeHandle(
    ref,
    () => ({
      present: handleOpen,
    }),
    [handleOpen],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose={!isProcessing}
      backdropComponent={renderBackdrop}
      backgroundStyle={tw`bg-white dark:bg-gray-900`}
      handleIndicatorStyle={tw`bg-gray-300 dark:bg-gray-700`}
    >
      <View style={tw`flex-1`}>
        {/* Header */}
        <View
          style={tw`flex-row justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800`}
        >
          <Text style={tw`text-xl font-bold text-gray-900 dark:text-gray-50`}>
            Secure Your Spot
          </Text>
          {!isProcessing && (
            <Pressable onPress={handleClose}>
              <Text style={tw`text-lg font-semibold text-[#E91E63]`}>
                Cancel
              </Text>
            </Pressable>
          )}
        </View>

        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          style={tw`flex-1`}
        >
          <View style={tw`px-6 py-6`}>
            {/* Event Summary */}
            <View
              style={tw`mb-6 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-5`}
            >
              <View style={tw`mb-4`}>
                <Text
                  style={tw`text-lg font-bold text-gray-900 dark:text-gray-50`}
                >
                  {event.title}
                </Text>
                {event.celebrity?.name && (
                  <Text style={tw`text-base text-gray-600 dark:text-gray-400`}>
                    with {event.celebrity.name}
                  </Text>
                )}
              </View>

              <View style={tw`flex-row items-center justify-between`}>
                <View>
                  <Text
                    style={tw`text-xs text-gray-500 dark:text-gray-400 mb-1`}
                  >
                    LOCATION
                  </Text>
                  <Text
                    style={tw`text-sm font-medium text-gray-900 dark:text-gray-50`}
                  >
                    📍 {event.location}
                  </Text>
                </View>
                <View>
                  <Text
                    style={tw`text-xs text-gray-500 dark:text-gray-400 mb-1`}
                  >
                    DURATION
                  </Text>
                  <Text
                    style={tw`text-sm font-medium text-gray-900 dark:text-gray-50`}
                  >
                    ⏱️ {event.slotDuration} min
                  </Text>
                </View>
              </View>
            </View>

            {/* Price Display */}
            <View
              style={tw`mb-6 rounded-2xl border-2 border-[#E91E63]/20 bg-[#E91E63]/5 p-5`}
            >
              <Text
                style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2`}
              >
                TOTAL AMOUNT
              </Text>
              <View style={tw`flex-row items-baseline`}>
                <Text style={tw`text-4xl font-bold text-[#E91E63]`}>
                  ${priceInDollars}
                </Text>
                <Text style={tw`ml-2 text-lg text-gray-600 dark:text-gray-400`}>
                  USD
                </Text>
              </View>
              <Text style={tw`mt-2 text-sm text-gray-600 dark:text-gray-400`}>
                One-time payment to secure your position in line
              </Text>
            </View>

            {/* Payment Form */}
            <View style={tw`mb-6`}>
              <Text
                style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3`}
              >
                PAYMENT DETAILS
              </Text>

              <View
                style={tw`rounded-2xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4`}
              >
                <CardField
                  postalCodeEnabled={true}
                  placeholder={{
                    number: "4242 4242 4242 4242",
                  }}
                  cardStyle={{
                    backgroundColor: tw.color("white dark:gray-900"),
                    textColor: tw.color("gray-900 dark:gray-50"),
                    placeholderColor: tw.color("gray-400"),
                    borderWidth: 0,
                  }}
                  style={{
                    width: "100%",
                    height: 50,
                  }}
                  onCardChange={(cardDetails) => {
                    setCardComplete(cardDetails.complete);
                  }}
                />
              </View>

              <Text style={tw`mt-2 text-xs text-gray-500 dark:text-gray-400`}>
                💳 Powered by Stripe - Your payment is secure
              </Text>
            </View>

            {/* Security Info */}
            <View
              style={tw`mb-6 rounded-2xl bg-green-50 dark:bg-green-950/30 p-4`}
            >
              <Text
                style={tw`text-sm text-green-900 dark:text-green-100 leading-relaxed`}
              >
                🔒 Your payment information is encrypted and secure. We never
                store your card details.
              </Text>
            </View>

            {/* Pay Button */}
            <Pressable
              onPress={handlePayment}
              disabled={!cardComplete || isProcessing}
              style={({ pressed }) => [
                tw`rounded-2xl py-4 mb-4`,
                {
                  backgroundColor:
                    !cardComplete || isProcessing
                      ? tw.color("gray-400")
                      : tw.color("#E91E63"),
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              {isProcessing ? (
                <View style={tw`flex-row items-center justify-center`}>
                  <ActivityIndicator color="white" />
                  <Text style={tw`ml-2 text-lg font-bold text-white`}>
                    Processing...
                  </Text>
                </View>
              ) : (
                <Text style={tw`text-center text-lg font-bold text-white`}>
                  Pay ${priceInDollars} & Join Queue
                </Text>
              )}
            </Pressable>

            {/* Terms */}
            <Text
              style={tw`text-center text-xs text-gray-500 dark:text-gray-400`}
            >
              By proceeding, you agree to our Terms of Service and acknowledge
              that payments are non-refundable.
            </Text>
          </View>
        </BottomSheetScrollView>
      </View>
    </BottomSheetModal>
  );
});
