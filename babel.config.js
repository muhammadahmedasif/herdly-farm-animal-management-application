module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated requires its Babel plugin to be the LAST plugin.
    // Without it, release (APK / Gradle) builds fail or crash at launch.
    plugins: ['react-native-reanimated/plugin'],
  };
};
