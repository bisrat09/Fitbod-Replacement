module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Reanimated plugin moved to react-native-worklets in RN 0.81
      "react-native-worklets/plugin",
    ],
  };
};
