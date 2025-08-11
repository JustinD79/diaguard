require('react-native-url-polyfill/auto');

global.window = global;
global.window.location = { protocol: 'http:' };
global.location = global.window.location;
global.self = global;

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add resolver alias to prevent stripe from being bundled on web
config.resolver.alias = Object.assign({}, config.resolver.alias, {
  'stripe': require.resolve('./metro-shims/stripe-shim.js'),
});

// Block server-side files from being bundled
config.resolver.blockList = [
  /supabase\/functions\/.*/,
  /.*\+api\.ts$/,
];

// Add support for web platform
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Ensure proper asset extensions
config.resolver.assetExts.push('db', 'mp3', 'ttf', 'obj', 'png', 'jpg');

// Add source extensions for web
config.resolver.sourceExts.push('jsx', 'js', 'ts', 'tsx', 'json', 'wasm', 'svg');

// Configure transformer for web compatibility
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
  minifierConfig: {
    mangle: {
      keep_fnames: true,
    },
  },
};

// Web-specific resolver configuration
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;