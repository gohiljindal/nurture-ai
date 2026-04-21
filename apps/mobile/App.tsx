import {
  PlusJakartaSans_400Regular as Poppins_400Regular,
  PlusJakartaSans_500Medium as Poppins_500Medium,
  PlusJakartaSans_600SemiBold as Poppins_600SemiBold,
  PlusJakartaSans_700Bold as Poppins_700Bold,
  PlusJakartaSans_800ExtraBold as Poppins_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";

import { THEME } from "./constants/theme";
import RootNavigator from "./navigation/RootNavigator";

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: THEME.page,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <RootNavigator />
    </>
  );
}
