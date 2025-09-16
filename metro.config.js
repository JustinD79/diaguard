const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Remove problematic serializer plugins that cause module resolution issues
if (config.serializer && config.serializer.customSerializer) {
  delete config.serializer.customSerializer;
}

// Ensure resolver stability
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'native', 'web'],
  unstable_enableSymlinks: false,
  unstable_enablePackageExports: true,
};

module.exports = config;