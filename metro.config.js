const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

let config = getDefaultConfig(__dirname);

// Enable web support
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add support for additional file extensions
config.resolver.sourceExts.push('sql', 'db');

// Configure resolver for Node.js environment
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Add platform-specific resolver for web builds
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add alias for window object in Node.js environment
config.resolver.alias = {
  ...config.resolver.alias,
  'window': path.resolve(__dirname, 'metro-shims/window-shim.js'),
};

// Configure for web compatibility
if (process.env.EXPO_PLATFORM === 'web') {
  config.resolver.alias = {
    ...config.resolver.alias,
    'window': path.resolve(__dirname, 'metro-shims/window-shim.js'),
  };
}

// Configure transformer for better web compatibility
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config;