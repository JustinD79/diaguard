module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated plugin should be last
      'react-native-reanimated/plugin',
    ],
  };
};