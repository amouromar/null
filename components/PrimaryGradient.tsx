import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleProp } from "react-native";
import Animated from "react-native-reanimated";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

interface PrimaryGradientProps {
  style?: StyleProp<any>;
  children?: React.ReactNode;
  opacity?: number;
}

/**
 * PrimaryGradient component using the user's requested color scheme:
 * bg-radial-at-t from-amber-700 via-orange-300 to-rose-800
 *
 * Approximated colors for Amber 700 to Orange 300 to Rose 800
 */
export default function PrimaryGradient({
  style,
  children,
  opacity = 1,
}: PrimaryGradientProps) {
  return (
    <AnimatedLinearGradient
      // Approximating "radial-at-t" (top) with a vertical linear gradient
      colors={["#B45309", "#FDBA74", "#9F1239"]}
      locations={[0, 0.5, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[style, { opacity }]}
    >
      {children}
    </AnimatedLinearGradient>
  );
}
