const path = require('path');
const webpack = require('webpack');

module.exports = function override(config) {
  const alias = config.resolve.alias || {};
  Object.assign(alias, {
    'fs-extra': path.resolve(__dirname, 'src/polyfills/fs-extra.js'),
  });
  config.resolve.alias = alias;
  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    path: require.resolve('path-browserify'),
    os: require.resolve('os-browserify/browser'),
    stream: require.resolve('stream-browserify'),
    crypto: require.resolve('crypto-browserify'),
    assert: require.resolve('assert'),
    'fs-extra': false,
    vm: false,
    fs: false,
    module: false,
    constants: false,
  });
  config.resolve.fallback = fallback;
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
    new webpack.ProvidePlugin({
      'process.hrtime': [path.resolve(__dirname, 'src/polyfills/process-shim.js'), 'default'],
    }),
  ]);
  config.ignoreWarnings = [/Failed to parse source map/];
  config.module.rules.push({
    test: /\.(js|mjs|jsx)$/,
    enforce: 'pre',
    loader: require.resolve('source-map-loader'),
    resolve: {
      fullySpecified: false,
    },
  });
  return config;
};
