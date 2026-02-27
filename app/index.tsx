import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import BatteryStatus from "../components/BatteryStatus";
import InitiateButton from "../components/InitiateButton";
import QuickPresets from "../components/QuickPresets";
import { useTheme } from "../components/ThemeContext";
import TimeScroller from "../components/TimeScroller";

const BlinkingCursor = () => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    const interval = setInterval(() => {
      opacity.value = opacity.value === 1 ? 0 : 1;
    }, 500);
    return () => clearInterval(interval);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[style, { width: 2, height: 16, backgroundColor: "#FFFFFFE6" }]}
    />
  );
};

export default function Index() {
  const router = useRouter();
  const [minutes, setMinutes] = useState(45);
  const [whitelistedNames, setWhitelistedNames] = useState<string[]>([]);
  const { colors } = useTheme();

  // Refresh whitelist whenever screen is focused (e.g. returning from settings)
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const stored = await AsyncStorage.getItem("null_whitelist_v2");
          if (stored) {
            const parsed = JSON.parse(stored) as {
              name: string;
              active: boolean;
            }[];
            const active = parsed.filter((c) => c.active).map((c) => c.name);
            setWhitelistedNames(active);
          }
        } catch (e) {
          console.error("Failed to load whitelist", e);
        }
      })();
    }, []),
  );

  const handleInitiate = () => {
    router.replace({
      pathname: "/null",
      params: { duration: minutes },
    });
  };

  const restrictedListStr =
    whitelistedNames.length > 0 ? whitelistedNames.join(", ") : "NONE";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View className="flex-row justify-between items-center px-6 pt-2">
        <View className="flex-row items-center">
          <Text
            style={{ fontFamily: "RobotoMono-Regular" }}
            className="text-[#FFFFFFE6] text-xl tracking-tighter"
          >
            NULL
          </Text>
          <BlinkingCursor />
        </View>

        <TouchableOpacity
          onPress={() => router.push("/settings")}
          activeOpacity={0.7}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <Text
            style={{
              fontFamily: "RobotoMono-Bold",
              fontSize: 14,
              color: "#666666",
            }}
          >
            [ SETTINGS ]
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 justify-between py-10">
        {/* Main Timer Section */}
        <Animated.View entering={FadeIn.delay(200)} className="items-center">
          <Text
            style={{ fontFamily: "RobotoMono-Regular" }}
            className="text-[#979797] text-xs tracking-widest mb-2"
          >
            SET DURATION
          </Text>
          <TimeScroller minutes={minutes} onMinutesChange={setMinutes} />

          <View className="mt-4">
            <Text
              style={{ fontFamily: "RobotoMono-Regular" }}
              className="text-[#666666] text-[10px] text-center px-10 leading-4"
            >
              {restrictedListStr}
            </Text>
          </View>
        </Animated.View>

        {/* Interaction Section */}
        <View className="items-center gap-10">
          <QuickPresets onSelect={setMinutes} activeValue={minutes} />
          <InitiateButton onInitiate={handleInitiate} />
        </View>

        {/* Footer */}
        <View className="px-6 flex-row justify-between items-center">
          <BatteryStatus />
          <Text
            style={{ fontFamily: "RobotoMono-Regular" }}
            className="text-[10px] text-[#666666]"
          >
            OLED OPTIMIZED STATE ACTIVE
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
