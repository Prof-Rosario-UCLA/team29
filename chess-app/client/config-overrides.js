module.exports = function override(config, env) {
  // Add WebAssembly support
  config.resolve.fallback = {
    ...config.resolve.fallback,
    fs: false,
    path: false,
  };

  // Add WebAssembly loader
  config.module.rules.push({
    test: /\.wasm$/,
    type: 'webassembly/async',
  });

  // Enable WebAssembly
  config.experiments = {
    ...config.experiments,
    asyncWebAssembly: true,
  };

  return config;
}; 