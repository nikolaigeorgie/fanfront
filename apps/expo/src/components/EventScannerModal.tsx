import { useEffect, useRef, useState } from "react";
import { Alert, Modal, Pressable, Text, TextInput, View } from "react-native";
import { Camera, CameraView } from "expo-camera";
import { useMutation, useQuery } from "convex/react";

import type { PaymentBottomSheetRef } from "./PaymentBottomSheet";
import { api } from "../../convex/_generated/api";
import { PaymentBottomSheet } from "./PaymentBottomSheet";

interface EventScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (event: any, queueData: any) => void;
  userId: string;
}

export function EventScannerModal({
  visible,
  onClose,
  onSuccess,
  userId,
}: EventScannerModalProps) {
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [eventCode, setEventCode] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const paymentSheetRef = useRef<PaymentBottomSheetRef>(null);

  const getEventByCode = useQuery(
    api.events.getEventByCode,
    eventCode ? { eventCode } : "skip",
  );

  const joinQueue = useMutation(api.queue.joinQueue);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    if (visible && mode === "scan") {
      getCameraPermissions();
    }
  }, [visible, mode]);

  useEffect(() => {
    if (getEventByCode && !showEventDetails) {
      setShowEventDetails(true);
    }
  }, [getEventByCode, showEventDetails]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setEventCode(data);
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      setEventCode(manualCode.trim().toUpperCase());
      setShowEventDetails(true);
    }
  };

  const handleShowPayment = () => {
    setShowEventDetails(false);
    setShowPayment(true);
    // Small delay to allow modal transition
    setTimeout(() => {
      paymentSheetRef.current?.present?.();
    }, 100);
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!getEventByCode || !userId) return;

    try {
      const queueEntryId = await joinQueue({
        eventId: getEventByCode._id,
        userId: userId as any,
        paymentIntentId,
      });

      // Close this modal
      onClose();

      // Reset state
      setScanned(false);
      setEventCode("");
      setManualCode("");
      setShowEventDetails(false);
      setShowPayment(false);

      // Show success modal with queue data
      onSuccess(getEventByCode, {
        queueEntryId,
        position: getEventByCode.currentQueueCount + 1,
        estimatedTime:
          Date.now() +
          getEventByCode.currentQueueCount *
            getEventByCode.slotDuration *
            60 *
            1000,
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to join queue");
    }
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setShowEventDetails(true);
  };

  const resetScanner = () => {
    setScanned(false);
    setEventCode("");
    setManualCode("");
    setShowEventDetails(false);
    setShowPayment(false);
  };

  const handleClose = () => {
    resetScanner();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View className="flex-1 bg-black">
        {/* Header */}
        <View className="bg-black/90 px-6 py-4 pt-12">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-white">Join Event</Text>
            <Pressable onPress={handleClose}>
              <Text className="text-lg text-blue-400">Close</Text>
            </Pressable>
          </View>

          {/* Mode Selector */}
          <View className="mt-4 flex-row rounded-xl bg-gray-800/50 p-1">
            <Pressable
              onPress={() => setMode("scan")}
              className={`flex-1 rounded-lg px-4 py-2 ${
                mode === "scan" ? "bg-blue-600" : ""
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  mode === "scan" ? "text-white" : "text-white/70"
                }`}
              >
                📱 Scan QR
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("manual")}
              className={`flex-1 rounded-lg px-4 py-2 ${
                mode === "manual" ? "bg-blue-600" : ""
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  mode === "manual" ? "text-white" : "text-white/70"
                }`}
              >
                🔢 Enter Code
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Content */}
        {mode === "scan" ? (
          /* QR Scanner */
          <View className="flex-1">
            {hasPermission === null ? (
              <View className="flex-1 items-center justify-center">
                <Text className="text-white">
                  Requesting camera permission...
                </Text>
              </View>
            ) : hasPermission === false ? (
              <View className="flex-1 items-center justify-center px-6">
                <Text className="mb-4 text-center text-white">
                  Camera permission is required to scan QR codes
                </Text>
                <Pressable
                  onPress={handleClose}
                  className="rounded-lg bg-blue-600 px-6 py-3"
                >
                  <Text className="font-medium text-white">Close</Text>
                </Pressable>
              </View>
            ) : (
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ["qr", "pdf417"],
                }}
              >
                {/* Overlay */}
                <View className="flex-1 items-center justify-center">
                  <View className="relative h-64 w-64">
                    {/* Scanning frame */}
                    <View className="absolute inset-0 rounded-2xl border-2 border-white/30" />

                    {/* Corner indicators */}
                    <View className="absolute top-0 left-0 h-8 w-8 rounded-tl-2xl border-t-4 border-l-4 border-blue-400" />
                    <View className="absolute top-0 right-0 h-8 w-8 rounded-tr-2xl border-t-4 border-r-4 border-blue-400" />
                    <View className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-blue-400" />
                    <View className="absolute right-0 bottom-0 h-8 w-8 rounded-br-2xl border-r-4 border-b-4 border-blue-400" />
                  </View>
                  <Text className="mt-6 px-6 text-center text-lg text-white">
                    Position the QR code within the frame
                  </Text>
                </View>
              </CameraView>
            )}
          </View>
        ) : (
          /* Manual Code Entry */
          <View className="flex-1 px-6 py-8">
            <View className="mb-8 items-center">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-gray-800/50">
                <Text className="text-3xl">🔢</Text>
              </View>
              <Text className="mb-2 text-xl font-semibold text-white">
                Enter Event Code
              </Text>
              <Text className="text-center text-white/70">
                Enter the 6-digit code from the event kiosk
              </Text>
            </View>

            <View className="space-y-4">
              <TextInput
                className="rounded-2xl border border-white/20 bg-gray-800/50 px-6 py-4 text-center font-mono text-lg tracking-widest text-white"
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="ABC123"
                placeholderTextColor="#ffffff60"
                autoCapitalize="characters"
                maxLength={6}
                autoFocus
              />

              <Pressable
                onPress={handleManualSubmit}
                className={`rounded-2xl px-6 py-4 ${
                  manualCode.length >= 3 ? "bg-blue-600" : "bg-gray-700"
                }`}
                disabled={manualCode.length < 3}
              >
                <Text className="text-center text-lg font-semibold text-white">
                  Find Event
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Event Details Modal */}
        {showEventDetails && (
          <View className="absolute inset-0 justify-end bg-black/50">
            <View className="rounded-t-3xl border-t border-white/10 bg-gray-900">
              {getEventByCode ? (
                <View className="p-6">
                  {/* Event Info */}
                  <View className="mb-6 items-center">
                    <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-blue-600">
                      <Text className="text-2xl text-white">🎫</Text>
                    </View>
                    <Text className="mb-2 text-center text-2xl font-bold text-white">
                      {getEventByCode.title}
                    </Text>
                    <Text className="text-center text-lg text-white/70">
                      with {getEventByCode.celebrity?.name}
                    </Text>
                  </View>

                  {/* Event Details */}
                  <View className="mb-6 rounded-2xl bg-gray-800/50 p-4">
                    <Text className="mb-2 text-white/70">
                      {getEventByCode.description}
                    </Text>
                    <View className="mt-4 flex-row items-center justify-between">
                      <View>
                        <Text className="text-xs tracking-wide text-white/60 uppercase">
                          QUEUE
                        </Text>
                        <Text className="font-semibold text-white">
                          {getEventByCode.currentQueueCount}/
                          {getEventByCode.maxCapacity}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-xs tracking-wide text-white/60 uppercase">
                          DURATION
                        </Text>
                        <Text className="font-semibold text-white">
                          ~{getEventByCode.slotDuration} min
                        </Text>
                      </View>
                      <View>
                        <Text className="text-xs tracking-wide text-white/60 uppercase">
                          LOCATION
                        </Text>
                        <Text className="font-semibold text-white">
                          {getEventByCode.location}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Actions */}
                  <View className="flex-row space-x-3">
                    <Pressable
                      onPress={resetScanner}
                      className="flex-1 rounded-2xl bg-gray-700 py-4"
                    >
                      <Text className="text-center font-semibold text-white">
                        Try Another
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={handleShowPayment}
                      className={`flex-1 rounded-2xl py-4 ${
                        getEventByCode.availableSlots > 0
                          ? "bg-blue-600"
                          : "bg-gray-600"
                      }`}
                      disabled={getEventByCode.availableSlots <= 0}
                    >
                      <Text className="text-center font-semibold text-white">
                        {getEventByCode.availableSlots > 0
                          ? "Continue"
                          : "Queue Full"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                /* Event Not Found */
                <View className="items-center p-6">
                  <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-red-600/20">
                    <Text className="text-2xl text-red-400">❌</Text>
                  </View>
                  <Text className="mb-2 text-xl font-bold text-white">
                    Event Not Found
                  </Text>
                  <Text className="mb-6 text-center text-white/70">
                    The event code "{eventCode}" is invalid, expired, or the
                    event has ended.
                  </Text>
                  <Pressable
                    onPress={resetScanner}
                    className="rounded-2xl bg-blue-600 px-8 py-4"
                  >
                    <Text className="font-semibold text-white">Try Again</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Payment Bottom Sheet */}
        {showPayment && getEventByCode && userId && (
          <PaymentBottomSheet
            ref={paymentSheetRef}
            event={getEventByCode}
            userId={userId}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        )}
      </View>
    </Modal>
  );
}
