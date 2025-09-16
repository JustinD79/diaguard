const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure compatibility with Metro 0.81+ and importLocationsPlugin
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'native', 'web'],
  unstable_enableSymlinks: false,
  unstable_enablePackageExports: true,
};

// Remove any problematic serializer customizations that might conflict
// with the importLocationsPlugin requirement
if (config.serializer) {
  // Keep default serializer behavior to ensure importLocationsPlugin works
  delete config.serializer.customSerializer;
}

// Ensure transformer compatibility
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

module.exports = config;