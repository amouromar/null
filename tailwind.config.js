/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        light: ["RobotoMono-Light"],
        regular: ["RobotoMono-Regular"],
        medium: ["RobotoMono-Medium"],
        semibold: ["RobotoMono-SemiBold"],
        bold: ["RobotoMono-Bold"],
        extrabold: ["RobotoMono-ExtraBold"],
      },
    },
  },
  plugins: [],
};
