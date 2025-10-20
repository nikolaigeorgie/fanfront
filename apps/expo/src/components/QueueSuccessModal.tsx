import { useEffect, useState } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";

interface QueueSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  event?: {
    title: string;
    celebrity?: { name: string };
    location: string;
  };
  queuePosition?: number;
  estimatedTime?: number;
}

export function QueueSuccessModal({
  visible,
  onClose,
  event,
  queuePosition,
  estimatedTime,
}: QueueSuccessModalProps) {
  const [showTicket, setShowTicket] = useState(false);
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    if (visible) {
      // Show success animation first
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Show ticket after 1 second
      setTimeout(() => setShowTicket(true), 1000);
    } else {
      setShowTicket(false);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible]);

  if (!visible || !event) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
    >
      <View className="flex-1 bg-black">
        {!showTicket ? (
          /* Success Animation */
          <View className="flex-1 items-center justify-center px-6">
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              }}
              className="items-center"
            >
              <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-green-600">
                <Text className="text-4xl text-white">✓</Text>
              </View>
              <Text className="mb-4 text-center text-3xl font-bold text-white">
                You're in line!
              </Text>
              <Text className="text-center text-lg text-white/70">
                Generating your queue ticket...
              </Text>
            </Animated.View>
          </View>
        ) : (
          /* Ticket Confirmation */
          <View className="flex-1 items-center justify-center px-6">
            <View className="mb-8">
              <Text className="mb-2 text-center text-2xl font-bold text-white">
                See you at {event.location}
              </Text>
              <Text className="text-center text-white/70">
                You'll receive notifications when it's almost your turn.
              </Text>
              <Text className="mt-2 text-center text-sm text-white/50 underline">
                View or cancel your reservation
              </Text>
            </View>

            {/* Share Section */}
            <View className="mb-8 items-center">
              <Text className="mb-4 text-sm tracking-wide text-white/60 uppercase">
                SHARE ON:
              </Text>
              <View className="flex-row space-x-6">
                <View className="h-10 w-10 items-center justify-center rounded bg-white/10">
                  <Text className="text-white">𝕏</Text>
                </View>
                <View className="h-10 w-10 items-center justify-center rounded bg-white/10">
                  <Text className="text-white">in</Text>
                </View>
              </View>
            </View>

            {/* Digital Ticket */}
            <View className="mb-8 rounded-3xl border border-white/20 bg-gray-900 p-1">
              <View className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600">
                {/* Ticket Header */}
                <View className="relative h-48">
                  {/* Animated background pattern */}
                  <View className="absolute inset-0">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <View
                        key={i}
                        className="absolute rounded-lg bg-white/10"
                        style={{
                          width: Math.random() * 40 + 20,
                          height: Math.random() * 40 + 20,
                          left: Math.random() * 300,
                          top: Math.random() * 180,
                          transform: [{ rotate: `${Math.random() * 360}deg` }],
                        }}
                      />
                    ))}
                  </View>
                </View>

                {/* Ticket Info */}
                <View className="bg-black p-6">
                  <View className="mb-4 flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-white">
                        {event.title}
                      </Text>
                      <Text className="text-sm text-white/70">
                        {event.celebrity?.name}
                      </Text>
                    </View>
                    <View className="h-8 w-8 items-center justify-center rounded-lg bg-white">
                      <Text className="font-bold text-black">F</Text>
                    </View>
                  </View>

                  <View className="border-t border-white/20 pt-4">
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-xs tracking-wide text-white/60 uppercase">
                          POSITION
                        </Text>
                        <Text className="text-lg font-bold text-white">
                          #{queuePosition}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-xs tracking-wide text-white/60 uppercase">
                          EST. TIME
                        </Text>
                        <Text className="text-lg font-bold text-white">
                          {estimatedTime
                            ? new Date(estimatedTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "TBD"}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-xs tracking-wide text-white/60 uppercase">
                          QUEUE ID
                        </Text>
                        <Text className="text-lg font-bold text-white">
                          #{String(queuePosition).padStart(6, "0")}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Barcode */}
                  <View className="mt-4 border-t border-white/20 pt-4">
                    <View className="flex-row justify-center space-x-1">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <View
                          key={i}
                          className="bg-white"
                          style={{
                            width: Math.random() > 0.5 ? 2 : 4,
                            height: 30,
                          }}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Generating Status */}
            <View className="mb-8 w-full rounded-2xl bg-gray-800/50 px-6 py-4">
              <Text className="text-center text-white/60">Generating...</Text>
            </View>

            {/* Continue Button */}
            <Pressable
              onPress={onClose}
              className="rounded-2xl bg-blue-600 px-8 py-4"
            >
              <Text className="text-lg font-semibold text-white">
                Continue to App
              </Text>
            </Pressable>

            {/* Footer */}
            <Text className="mt-8 text-center text-xs text-white/40">
              Powered by FanFront and Convex
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
