import { useState } from "react";
import { Pressable, Text } from "react-native";
import DatePicker from "react-native-date-picker";
import tw from "twrnc";

interface TimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
}

export const TimePicker = ({
  value,
  onChange,
  label = "Time",
}: TimePickerProps) => {
  const [open, setOpen] = useState(false);

  const timeStr = value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <>
      <Text style={tw`text-xs text-gray-500 dark:text-gray-400 mb-1`}>
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={tw`bg-gray-100 dark:bg-gray-900 rounded-2xl px-5 h-14 justify-center border-2 border-transparent`}
      >
        <Text style={tw`text-lg text-gray-900 dark:text-white`}>{timeStr}</Text>
      </Pressable>
      <DatePicker
        modal
        open={open}
        mode="time"
        date={value}
        onConfirm={(date) => {
          setOpen(false);
          onChange(date);
        }}
        onCancel={() => {
          setOpen(false);
        }}
        title={`Select ${label}`}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </>
  );
};
