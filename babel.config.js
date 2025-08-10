module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for expo-router
      require.resolve('expo-router/babel'),
      // Reanimated plugin should be last
      'react-native-reanimated/plugin',
    ],
  };
};