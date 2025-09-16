const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Ensure resolver configuration is properly set
config.resolver = {
  ...config.resolver,
  assetExts: [...(config.resolver?.assetExts || []), 'bin'],
};

module.exports = config;