import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

export default function HapticCalibrator() {
  const [intensity, setIntensity] = useState(0.5);
  const translateY = useSharedValue(100); // Center point of the line

  const triggerHaptic = (val: number) => {
    if (val < 0.3) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (val < 0.7) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const gesture = Gesture.Pan().onUpdate((event) => {
    const newVal = Math.max(0, Math.min(1, 1 - event.y / 200));
    translateY.value = event.y;
    runOnJS(setIntensity)(newVal);
    runOnJS(triggerHaptic)(newVal);
  });

  const animatedStyle = useAnimatedStyle(() => ({
    top: translateY.value,
  }));

  return (
    <View className="w-full py-6 items-center">
      <Text
        style={{ fontFamily: "RobotoMono-Regular" }}
        className="text-[#666666] text-[10px] mb-4 tracking-widest"
      >
        CALIBRATE_HAPTICS_SENSE
      </Text>
      <View className="h-[200px] w-[1px] bg-[#FFFFFF33] relative">
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[animatedStyle, styles.sliderThumb]}
            className="absolute left-[-10px] w-[20px] h-[2px] bg-[#FFFFFFE6]"
          />
        </GestureDetector>
        {/* Technical Markings */}
        <View className="absolute left-[10px] h-full justify-between py-2">
          <Text
            style={{ fontFamily: "RobotoMono-Regular" }}
            className="text-[#333333] text-[8px]"
          >
            MAX_MECH
          </Text>
          <Text
            style={{ fontFamily: "RobotoMono-Regular" }}
            className="text-[#333333] text-[8px]"
          >
            SOFT_BEAT
          </Text>
        </View>
      </View>
      <Text
        style={{ fontFamily: "RobotoMono-Bold" }}
        className="text-[#FFFFFFE6] text-xs mt-4"
      >
        INTENSITY: {(intensity * 100).toFixed(0)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sliderThumb: {
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
});
