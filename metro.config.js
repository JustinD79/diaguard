const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable web support
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add support for additional file extensions
config.resolver.sourceExts.push('sql', 'db');

// Add resolver alias for SSR compatibility
config.resolver.alias = {
  '@react-native-async-storage/async-storage': require.resolve('./metro-shims/async-storage-mock.js'),
};

// Configure resolver for Node.js environment
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Configure transformer for better web compatibility
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config;