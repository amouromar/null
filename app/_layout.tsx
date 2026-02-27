import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider } from "../components/ThemeContext";
import "../global.css";
import { loadActiveSession } from "../lib/sessionManager";

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    "RobotoMono-Light": require("../assets/Roboto_Mono/static/RobotoMono-Light.ttf"),
    "RobotoMono-Regular": require("../assets/Roboto_Mono/static/RobotoMono-Regular.ttf"),
    "RobotoMono-Medium": require("../assets/Roboto_Mono/static/RobotoMono-Medium.ttf"),
    "RobotoMono-SemiBold": require("../assets/Roboto_Mono/static/RobotoMono-SemiBold.ttf"),
    "RobotoMono-Bold": require("../assets/Roboto_Mono/static/RobotoMono-Bold.ttf"),
    "RobotoMono-ExtraBold": require("../assets/Roboto_Mono/RobotoMono-VariableFont_wght.ttf"),
  });

  const [sessionChecked, setSessionChecked] = useState(false);

  // ── Crash recovery: on every app boot, check for an interrupted session ──
  useEffect(() => {
    if (!fontsLoaded) return;

    (async () => {
      const session = await loadActiveSession();
      if (session) {
        // An active session survived the kill — drop the user straight back in.
        // Pass the endTime so null.tsx can pick up exactly where it left off.
        router.replace({
          pathname: "/null",
          params: { endTime: String(session.endTime) },
        });
      }
      setSessionChecked(true);
    })();
  }, [fontsLoaded, router]);

  if (!fontsLoaded || !sessionChecked) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            animationDuration: 200,
            contentStyle: { backgroundColor: "transparent" },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              animation: "slide_from_right",
              animationDuration: 200,
              contentStyle: { backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              animation: "slide_from_right",
              animationDuration: 200,
              contentStyle: { backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="null"
            options={{
              animation: "fade_from_bottom",
              animationDuration: 200,
              contentStyle: { backgroundColor: "#000000" },
            }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    fontFamily: "RobotoMono-Regular",
    backgroundColor: "#000000",
  },
});
