import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import PrimaryGradient from "./PrimaryGradient";

interface InitiateButtonProps {
  onInitiate: () => void;
}

export default function InitiateButton({ onInitiate }: InitiateButtonProps) {
  const [isReady, setIsReady] = useState(false);
  const fillProgress = useSharedValue(0);
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (!isReady) {
      setIsReady(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    scale.value = withTiming(0.95, { duration: 100 });
    fillProgress.value = withTiming(
      1,
      { duration: 1000, easing: Easing.linear },
      (finished) => {
        if (finished) {
          runOnJS(handleComplete)();
        }
      },
    );
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
    if (fillProgress.value < 1) {
      fillProgress.value = withTiming(0, { duration: 200 });
    }
  };

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onInitiate();
  };

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillProgress.value * 100}%`,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View className="items-center w-full px-12">
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="w-full h-16 border border-[#FFFFFFE6] rounded-full overflow-hidden items-center justify-center"
      >
        <PrimaryGradient
          style={[containerStyle, StyleSheet.absoluteFill]}
          opacity={0.1}
        />
        <Animated.View
          style={[
            fillStyle,
            {
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              overflow: "hidden",
            },
          ]}
        >
          <PrimaryGradient
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "1000%", // Overshoot to keep gradient stable
            }}
          />
        </Animated.View>
        <Text
          style={{ fontFamily: "RobotoMono-Bold" }}
          className="text-[#FFFFFFE6] text-sm tracking-widest uppercase"
        >
          {isReady ? "HOLD_TO_INITIATE" : "INITIATE_FOCUS"}
        </Text>
      </Pressable>
    </View>
  );
}
