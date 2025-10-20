import { ActivityIndicator, View } from "react-native";
import tw from "twrnc";

export default function LoadingScreen() {
  return (
    <View
      style={tw`flex-1 items-center justify-center bg-white dark:bg-gray-950`}
    >
      <View style={tw`items-center justify-center`}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    </View>
  );
}
