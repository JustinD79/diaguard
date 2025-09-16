const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

let config = getDefaultConfig(__dirname);

// Enable web support
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add support for additional file extensions
config.resolver.sourceExts.push('sql', 'db');

// Configure resolver for Node.js environment
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Configure transformer for better web compatibility
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Apply NativeWind configuration
config = withNativeWind(config, { input: './global.css' });
