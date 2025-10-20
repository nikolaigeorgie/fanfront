import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View, Modal } from "react-native";
import { CameraView, Camera } from "expo-camera";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  onEventFound: (event: any) => void;
  userId: string;
}

export function QRScanner({ visible, onClose, onEventFound, userId }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [eventCode, setEventCode] = useState<string | null>(null);

  const getEventByCode = useQuery(
    api.events.getEventByCode,
    eventCode ? { eventCode } : "skip"
  );

  const joinQueue = useMutation(api.queue.joinQueue);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getCameraPermissions();
  }, []);

  useEffect(() => {
    if (getEventByCode && !scanned) {
      setScanned(true);
      onEventFound(getEventByCode);
    }
  }, [getEventByCode, scanned, onEventFound]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    setEventCode(data);
  };

  const handleJoinQueue = async () => {
    if (!getEventByCode || !userId) return;

    try {
      await joinQueue({
        eventId: getEventByCode._id,
        userId: userId as any,
      });
      
      Alert.alert(
        "Success!",
        `You've joined the queue for ${getEventByCode.title}!`,
        [{ text: "OK", onPress: onClose }]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to join queue");
      setScanned(false);
      setEventCode(null);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setEventCode(null);
  };

  if (hasPermission === null) {
    return (
      <Modal visible={visible} animationType="slide">
        <View className="flex-1 justify-center items-center bg-background">
          <Text className="text-foreground">Requesting camera permission...</Text>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide">
        <View className="flex-1 justify-center items-center bg-background p-6">
          <Text className="text-foreground text-center mb-4">
            Camera permission is required to scan QR codes
          </Text>
          <Pressable
            onPress={onClose}
            className="bg-primary rounded-lg px-6 py-3"
          >
            <Text className="text-primary-foreground font-medium">Close</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View className="flex-1 bg-black">
        {/* Header */}
        <View className="bg-background/90 px-4 py-3 pt-12">
          <View className="flex-row items-center justify-between">
            <Text className="text-foreground text-lg font-semibold">
              Scan QR Code
            </Text>
            <Pressable onPress={onClose}>
              <Text className="text-primary text-lg">Close</Text>
            </Pressable>
          </View>
        </View>

        {/* Camera */}
        <View className="flex-1">
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "pdf417"],
            }}
          >
            {/* Overlay */}
            <View className="flex-1 justify-center items-center">
              <View className="w-64 h-64 border-2 border-white rounded-lg">
                <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
              </View>
              <Text className="text-white text-center mt-4 px-6">
                Position the QR code within the frame
              </Text>
            </View>
          </CameraView>
        </View>

        {/* Event Details */}
        {getEventByCode && (
          <View className="bg-background p-6">
            <Text className="text-foreground text-xl font-bold mb-2">
              {getEventByCode.title}
            </Text>
            <Text className="text-foreground opacity-70 mb-2">
              with {getEventByCode.celebrity?.name}
            </Text>
            <Text className="text-foreground mb-4">
              {getEventByCode.description}
            </Text>
            
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-foreground">
                Queue: {getEventByCode.currentQueueCount}/{getEventByCode.maxCapacity}
              </Text>
              <Text className="text-foreground">
                ~{getEventByCode.slotDuration} min per person
              </Text>
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={resetScanner}
                className="flex-1 bg-muted rounded-lg py-3"
              >
                <Text className="text-foreground text-center font-medium">
                  Scan Another
                </Text>
              </Pressable>
              <Pressable
                onPress={handleJoinQueue}
                className="flex-1 bg-primary rounded-lg py-3"
                disabled={getEventByCode.availableSlots <= 0}
              >
                <Text className="text-primary-foreground text-center font-medium">
                  {getEventByCode.availableSlots > 0 ? "Join Queue" : "Queue Full"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {scanned && !getEventByCode && (
          <View className="bg-background p-6">
            <Text className="text-foreground text-center mb-4">
              Event not found or invalid QR code
            </Text>
            <Pressable
              onPress={resetScanner}
              className="bg-primary rounded-lg py-3"
            >
              <Text className="text-primary-foreground text-center font-medium">
                Try Again
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}
