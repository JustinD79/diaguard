const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add resolver alias to prevent stripe from being bundled on web
config.resolver.alias = {
  ...config.resolver.alias,
  'stripe': require.resolve('./metro-shims/stripe-shim.js'),
};

// Block server-side files from being bundled - use absolute paths for better exclusion
const projectRoot = __dirname;
config.resolver.blockList = [
  // Block all Supabase functions with proper escaping
  new RegExp(path.resolve(projectRoot, 'supabase', 'functions').replace(/[\\]/g, '\\\\') + '[\\\\/].*'),
  // Block all API routes - more specific pattern
  /.*[/\\]\+api\.(ts|js)$/,
  // Block server-only files
  /.*\.server\.(ts|js)$/,
  // Block any file with +api in the name anywhere in the project
  new RegExp('.*\\+api\\.(ts|js)$'),
  // Block entire supabase directory
  new RegExp(path.resolve(projectRoot, 'supabase').replace(/[\\]/g, '\\\\') + '[\\\\/].*'),
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

module.exports = config;