import * as Haptics from "expo-haptics";
import React from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";

interface TimeScrollerProps {
  minutes: number;
  onMinutesChange: (m: number) => void;
}

const ITEM_HEIGHT = 100;

export default function TimeScroller({
  minutes,
  onMinutesChange,
}: TimeScrollerProps) {
  const context = useSharedValue(0);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = minutes;
    })
    .onUpdate((event) => {
      const diff = Math.round(-event.translationY / 20);
      const newVal = Math.max(0, Math.min(180, context.value + diff * 5));
      if (newVal !== minutes) {
        runOnJS(onMinutesChange)(newVal);
        runOnJS(triggerHaptic)();
      }
    })
    .onEnd(() => {
      // Snap logic if needed
    });

  const formatTime = (totalMinutes: number) => {
    const mins = Math.floor(totalMinutes);
    return `${mins.toString().padStart(2, "0")}:00`;
  };

  return (
    <GestureDetector gesture={gesture}>
      <View className="items-center justify-center py-10">
        <View
          style={{ height: ITEM_HEIGHT }}
          className="items-center justify-center"
        >
          <Text
            style={{
              fontFamily: "RobotoMono-Bold",
              fontSize: 84,
              color: "#FFFFFFE6",
              includeFontPadding: false,
            }}
          >
            {formatTime(minutes)}
          </Text>
        </View>
      </View>
    </GestureDetector>
  );
}

// Optimization Note: For a "true" odometer effect, we would animate individual digits.
// This version uses a simplified gesture-mapped value approach.
// If the user wants extreme visual fidelity with "rolls", we can expand this.
