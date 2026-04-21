const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Ensure Metro always resolves @expo/vector-icons from this app's node_modules
const vectorIconsRoot = path.resolve(projectRoot, "node_modules/@expo/vector-icons");
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "@expo/vector-icons": vectorIconsRoot,
};

module.exports = withNativeWind(config, { input: "./global.css" });
