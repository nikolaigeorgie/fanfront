import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import tw from "twrnc";

interface LocationSearchInputProps {
  value: string;
  onChange: (location: LocationData) => void;
  label?: string;
  placeholder?: string;
  googleApiKey: string;
}

export interface LocationData {
  description: string;
  address?: string;
  street_name?: string;
  street_number?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  neighborhood?: string;
  label?: string;
}

export const LocationSearchInput = ({
  value,
  onChange,
  label = "Location",
  placeholder = "Search for a location...",
  googleApiKey,
}: LocationSearchInputProps) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["75%", "90%"], []);
  const [selectedLocation, setSelectedLocation] = useState(value);

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

  const onSelect = useCallback(
    (data: any, details: any) => {
      const address_components = details?.address_components;
      if (!address_components) {
        Alert.alert("Error", "Please select a valid address");
        return;
      }

      const street_name = address_components.find((c: any) =>
        c.types.includes("route"),
      )?.long_name;
      const street_number = address_components.find((c: any) =>
        c.types.includes("street_number"),
      )?.short_name;

      const locationData: LocationData = {
        city: address_components.find((c: any) => c.types.includes("locality"))
          ?.long_name,
        country: address_components.find((c: any) =>
          c.types.includes("country"),
        )?.short_name,
        description: data.description,
        neighborhood: address_components.find((c: any) =>
          c.types.includes("neighborhood"),
        )?.short_name,
        state: address_components.find((c: any) =>
          c.types.includes("administrative_area_level_1"),
        )?.long_name,
        street_name,
        address:
          street_number && street_name
            ? `${street_number} ${street_name}`
            : undefined,
        street_number,
        zip: address_components.find((c: any) =>
          c.types.includes("postal_code"),
        )?.long_name,
        label:
          street_number && street_name
            ? `${street_number} ${street_name}`
            : data.description,
      };

      // Use description as the display value
      setSelectedLocation(data.description);
      onChange(locationData);
      handleClose();
    },
    [onChange, handleClose],
  );

  const displayText = selectedLocation || placeholder;
  const hasValue = !!selectedLocation;

  return (
    <>
      <Text style={tw`text-xs text-gray-500 dark:text-gray-400 mb-1`}>
        {label}
      </Text>
      <Pressable
        onPress={handleOpen}
        style={tw`bg-gray-100 dark:bg-gray-900 rounded-2xl px-5 h-14 justify-center border-2 border-transparent`}
      >
        <Text
          style={[
            tw`text-lg`,
            hasValue
              ? tw`text-gray-900 dark:text-white`
              : tw`text-gray-400 dark:text-gray-500`,
          ]}
        >
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
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <View style={tw`flex-1`}>
          {/* Header */}
          <View
            style={tw`flex-row justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800`}
          >
            <Text
              style={tw`text-lg font-semibold text-gray-900 dark:text-gray-50`}
            >
              Search Location
            </Text>
            <Pressable onPress={handleClose}>
              <Text style={tw`text-lg font-semibold text-[#E91E63]`}>Done</Text>
            </Pressable>
          </View>

          {/* Google Places Autocomplete */}
          <View style={tw`flex-1 px-4 pt-4`}>
            <GooglePlacesAutocomplete
              placeholder="Search for a location..."
              fetchDetails
              onPress={onSelect}
              onFail={(error) => console.error("Places error:", error)}
              predefinedPlaces={[]}
              query={{
                key: googleApiKey,
                language: "en",
              }}
              styles={{
                container: {
                  flex: 0,
                },
                textInputContainer: {
                  backgroundColor: tw.color("gray-100"),
                  borderRadius: 16,
                  paddingHorizontal: 12,
                },
                textInput: {
                  height: 48,
                  color: tw.color("gray-900"),
                  fontSize: 16,
                  backgroundColor: "transparent",
                },
                poweredContainer: {
                  display: "none",
                },
                listView: {
                  backgroundColor: tw.color("white"),
                  marginTop: 8,
                },
                row: {
                  backgroundColor: tw.color("white"),
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                },
                separator: {
                  height: 1,
                  backgroundColor: tw.color("gray-200"),
                },
                description: {
                  color: tw.color("gray-900"),
                  fontSize: 15,
                },
              }}
              enablePoweredByContainer={false}
              debounce={300}
            />
          </View>
        </View>
      </BottomSheetModal>
    </>
  );
};
