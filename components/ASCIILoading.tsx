import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { runOnJS, useSharedValue, withTiming } from "react-native-reanimated";

interface ASCIILoadingProps {
  onComplete?: () => void;
  duration?: number;
}

export default function ASCIILoading({
  onComplete,
  duration = 800,
}: ASCIILoadingProps) {
  const [blocks, setBlocks] = useState(0);
  const totalBlocks = 10;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration }, (finished) => {
      if (finished && onComplete) {
        runOnJS(onComplete)();
      }
    });

    const interval = setInterval(() => {
      setBlocks((prev) => (prev < totalBlocks ? prev + 1 : prev));
    }, duration / totalBlocks);

    return () => clearInterval(interval);
  }, [duration, onComplete, progress]);

  const bar = "[" + "#".repeat(blocks) + "-".repeat(totalBlocks - blocks) + "]";

  return (
    <View className="py-2">
      <Text
        style={{ fontFamily: "RobotoMono-Bold" }}
        className="text-[#FFB300] text-xs"
      >
        {bar} INITIALIZING...
      </Text>
    </View>
  );
}
