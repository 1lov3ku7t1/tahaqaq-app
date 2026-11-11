// Engine and data live outside the app folder; bundle them so the build works offline.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../engine'), path.resolve(__dirname, '../data')];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
module.exports = config;
