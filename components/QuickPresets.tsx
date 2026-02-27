import * as Haptics from "expo-haptics";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface QuickPresetsProps {
  onSelect: (minutes: number) => void;
  activeValue?: number;
}

export default function QuickPresets({
  onSelect,
  activeValue,
}: QuickPresetsProps) {
  const presets = [25, 50, 90];

  const handlePress = (m: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(m);
  };

  return (
    <View className="flex-row justify-center gap-6">
      {presets.map((p) => (
        <TouchableOpacity
          key={p}
          onPress={() => handlePress(p)}
          activeOpacity={0.7}
        >
          <Text
            style={{
              fontFamily: "RobotoMono-Medium",
              color: activeValue === p ? "#FFFFFFE6" : "#666666",
            }}
            className="text-lg"
          >
            {p}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
