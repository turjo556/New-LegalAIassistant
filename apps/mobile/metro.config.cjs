const path = require('node:path');
const {getDefaultConfig} = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
const upstream = config.resolver.resolveRequest;
// The website retains React 19.1. Every native dependency must resolve the
// SDK 58 React/RN pair from this app, including hoisted Expo modules.
config.resolver.resolveRequest = (context, name, platform) => {
  const nativeRuntime = name === 'react' || name.startsWith('react/') || name === 'react-native' || name.startsWith('react-native/');
  const scoped = nativeRuntime ? {...context, originModulePath: path.join(__dirname, 'index.js')} : context;
  return upstream ? upstream(scoped, name, platform) : context.resolveRequest(scoped, name, platform);
};
module.exports = config;
