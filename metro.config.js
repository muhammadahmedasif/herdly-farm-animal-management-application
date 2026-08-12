const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite loads a .wasm file when bundling for web. Allow Metro to resolve it
// so `npx expo start` (web) works. Native Android/iOS builds don't use this path.
config.resolver.assetExts.push('wasm');

module.exports = config;
