import * as Battery from "expo-battery";
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";

export default function BatteryStatus() {
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    async function getBattery() {
      const initialLevel = await Battery.getBatteryLevelAsync();
      setLevel(initialLevel);
    }
    getBattery();

    const subscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setLevel(batteryLevel);
    });

    return () => subscription.remove();
  }, []);

  const percentage = level !== null ? Math.round(level * 100) : "--";

  return (
    <View className="flex-row items-center">
      <Text
        style={{ fontFamily: "RobotoMono-Regular" }}
        className="text-[10px] text-[#666666]"
      >
        BATTERY {percentage}%
      </Text>
    </View>
  );
}
