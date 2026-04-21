module.exports = function (api) {
  api.cache(true);
  const { plugins: cssInteropPlugins } = require("react-native-css-interop/babel")();
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: cssInteropPlugins,
  };
};
