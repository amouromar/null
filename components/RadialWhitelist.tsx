import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");
const CENTER_SIZE = 100;
const CANVAS_SIZE = width - 40;

interface ContactDotProps {
  id: string;
  name: string;
  initialX: number;
  initialY: number;
  onWhitelist: (id: string, inVoid: boolean) => void;
}

const ContactDot = ({
  id,
  name,
  initialX,
  initialY,
  onWhitelist,
}: ContactDotProps) => {
  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);
  const isInside = useSharedValue(false);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX + initialX;
      translateY.value = event.translationY + initialY;

      // Check distance to center (CANVAS_SIZE/2)
      const dist = Math.sqrt(
        Math.pow(translateX.value - CANVAS_SIZE / 2, 2) +
          Math.pow(translateY.value - CANVAS_SIZE / 2, 2),
      );

      const currentlyInside = dist < CENTER_SIZE / 2 + 10;
      if (currentlyInside !== isInside.value) {
        isInside.value = currentlyInside;
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onEnd(() => {
      if (isInside.value) {
        runOnJS(onWhitelist)(id, true);
      } else {
        translateX.value = withSpring(initialX);
        translateY.value = withSpring(initialY);
        runOnJS(onWhitelist)(id, false);
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: isInside.value ? 1.2 : 1 },
    ],
    backgroundColor: isInside.value ? "#FFB300" : "#666666",
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[style, styles.dot]}>
        <Text
          style={{ fontFamily: "RobotoMono-Bold" }}
          className="text-[6px] text-white"
        >
          {name.substring(0, 1).toUpperCase()}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
};

export default function RadialWhitelist() {
  const [whitelisted, setWhitelisted] = useState<string[]>([]);

  const contacts = [
    { id: "1", name: "Mom", x: 40, y: 40 },
    { id: "2", name: "Boss", x: 220, y: 60 },
    { id: "3", name: "Dad", x: 50, y: 220 },
    { id: "4", name: "Dev", x: 250, y: 240 },
  ];

  const handleWhitelist = (id: string, inVoid: boolean) => {
    if (inVoid) {
      setWhitelisted((prev) => [...new Set([...prev, id])]);
    } else {
      setWhitelisted((prev) => prev.filter((c) => c !== id));
    }
  };

  return (
    <View className="items-center py-6">
      <Text
        style={{ fontFamily: "RobotoMono-Regular" }}
        className="text-[#666666] text-[10px] mb-4 tracking-widest"
      >
        MODULE_COMM_BYPASS
      </Text>
      <View
        style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
        className="relative border border-[#FFFFFF0D] rounded-full justify-center items-center"
      >
        {/* The Central Void */}
        <View
          style={{ width: CENTER_SIZE, height: CENTER_SIZE }}
          className="border border-[#FFFFFFE6] rounded-full items-center justify-center"
        >
          <Text
            style={{ fontFamily: "RobotoMono-Bold" }}
            className="text-[#FFFFFFE6] text-[10px]"
          >
            NULL
          </Text>
        </View>

        {/* Technical Radial Lines */}
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          className="items-center justify-center"
        >
          <View className="w-full h-[0.5px] bg-[#FFFFFF0D] rotate-45 absolute" />
          <View className="w-full h-[0.5px] bg-[#FFFFFF0D] -rotate-45 absolute" />
        </View>

        {contacts.map((c) => (
          <ContactDot
            key={c.id}
            {...c}
            initialX={c.x}
            initialY={c.y}
            onWhitelist={handleWhitelist}
          />
        ))}
      </View>
      <Text
        style={{ fontFamily: "RobotoMono-Regular" }}
        className="text-[#666666] text-[8px] mt-4"
      >
        ACTIVE_BYPASS_COUNT: {whitelisted.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    left: 0,
    top: 0,
  },
});
