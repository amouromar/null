import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

export default function VoidStarMap() {
  // Mock data for stars (x, y, size, type)
  // In a real app, this would come from local storage / session history
  const stars = [
    { x: 50, y: 30, r: 1 },
    { x: 120, y: 80, r: 2 },
    { x: 200, y: 40, r: 1 },
    { x: 280, y: 150, r: 1.5 },
    { x: 80, y: 180, r: 3 }, // A large 90min star
    { x: 180, y: 220, r: 1 },
    { x: 250, y: 90, r: 1 },
    { x: 40, y: 250, r: 0.5, color: "#FF4444" }, // Flickering shame pixel
  ];

  return (
    <View className="w-full aspect-square items-center justify-center p-4">
      <View className="w-full h-full border border-[#FFFFFF1A] rounded-xl overflow-hidden bg-[#050505]">
        <Svg height="100%" width="100%">
          {stars.map((s, i) => (
            <Circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill={s.color || "#FFFFFFE6"}
              opacity={0.8}
            />
          ))}
        </Svg>
        <View className="absolute bottom-2 left-2">
          <Text
            style={{ fontFamily: "RobotoMono-Regular" }}
            className="text-[#333333] text-[8px]"
          >
            GALAXY_OF_FOCUS_V0.1
          </Text>
        </View>
      </View>
    </View>
  );
}
