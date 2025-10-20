import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useCallback, useMemo, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import tw from "twrnc";

interface DurationPickerProps {
  value: number;
  onChange: (duration: number) => void;
  label?: string;
}

const DURATION_OPTIONS = [
  { label: "5 minutes", value: 5 },
  { label: "10 minutes", value: 10 },
  { label: "15 minutes", value: 15 },
  { label: "20 minutes", value: 20 },
  { label: "30 minutes", value: 30 },
  { label: "45 minutes", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
  { label: "2 hours", value: 120 },
];

export const DurationPicker = ({
  value,
  onChange,
  label = "Duration",
}: DurationPickerProps) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["50%", "75%"], []);

  const handleOpen = useCallback(() => {
    bottomSheetRef.current?.present();
  }, []);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  const selectedOption = DURATION_OPTIONS.find((opt) => opt.value === value);
  const displayText = selectedOption?.label || `${value} minutes`;

  return (
    <>
      <Text style={tw`text-xs text-gray-500 dark:text-gray-400 mb-1`}>
        {label}
      </Text>
      <Pressable
        onPress={handleOpen}
        style={tw`bg-gray-100 dark:bg-gray-900 rounded-2xl px-5 h-14 justify-center border-2 border-transparent`}
      >
        <Text style={tw`text-lg text-gray-900 dark:text-white`}>
          {displayText}
        </Text>
      </Pressable>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={tw`bg-white dark:bg-gray-900`}
        handleIndicatorStyle={tw`bg-gray-300 dark:bg-gray-700`}
      >
        <View style={tw`flex-1`}>
          {/* Header */}
          <View
            style={tw`flex-row justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800`}
          >
            <Text
              style={tw`text-lg font-semibold text-gray-900 dark:text-gray-50`}
            >
              Select Duration
            </Text>
            <Pressable onPress={handleClose}>
              <Text style={tw`text-lg font-semibold text-[#E91E63]`}>Done</Text>
            </Pressable>
          </View>

          {/* Options List */}
          <BottomSheetScrollView showsVerticalScrollIndicator={false}>
            {DURATION_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  onChange(option.value);
                  handleClose();
                }}
                style={({ pressed }) => [
                  tw`px-6 py-4 border-b border-gray-100 dark:border-gray-800`,
                  {
                    backgroundColor: pressed
                      ? tw.color("gray-50")
                      : value === option.value
                        ? tw.color("pink-50")
                        : "transparent",
                  },
                ]}
              >
                <View style={tw`flex-row items-center justify-between`}>
                  <Text
                    style={[
                      tw`text-lg`,
                      value === option.value
                        ? tw`text-[#E91E63] font-semibold`
                        : tw`text-gray-900 dark:text-gray-50`,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {value === option.value && (
                    <Text style={tw`text-[#E91E63] text-xl`}>✓</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </BottomSheetScrollView>
        </View>
      </BottomSheetModal>
    </>
  );
};
