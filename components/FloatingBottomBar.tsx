import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const FloatingBottomBar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { name: "HOME", icon: "home-outline", activeIcon: "home", route: "/" },
    {
      name: "SETTINGS",
      icon: "settings-outline",
      activeIcon: "settings",
      route: "/settings",
    },
  ];

  if (pathname === "/null") return null;

  return (
    <View style={styles.container}>
      <View style={styles.blurContainer}>
        {navItems.map((item) => {
          const isActive = pathname === item.route;
          return (
            <TouchableOpacity
              key={item.name}
              style={styles.navItem}
              onPress={() => router.replace(item.route as any)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? (item.activeIcon as any) : (item.icon as any)}
                size={20}
                color={isActive ? "#FFFFFFE6" : "#666666"}
              />
              <Text style={[styles.navText, isActive && styles.activeNavText]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    left: 40,
    right: 40,
    alignItems: "center",
    zIndex: 1000,
  },
  blurContainer: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 100,
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "rgba(25, 25, 25, 0.8)",
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    overflow: "hidden",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  navText: {
    fontSize: 10,
    color: "#666666",
    fontFamily: "RobotoMono-Medium",
    letterSpacing: 1,
  },
  activeNavText: {
    color: "#FFFFFFE6",
  },
});

export default FloatingBottomBar;
