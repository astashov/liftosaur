const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const parentDir = path.resolve(__dirname, '..');
const parentNodeModules = path.resolve(parentDir, 'node_modules');

const sharedDeps = [
  'io-ts',
  'fp-ts',
  'lens-shmens',
  'dequal',
  'rollbar',
  'deepmerge',
  'micro-memoize',
];

const extraNodeModules = {};
for (const dep of sharedDeps) {
  extraNodeModules[dep] = path.resolve(parentNodeModules, dep);
}

const config = {
  watchFolders: [parentDir],
  resolver: {
    extraNodeModules: new Proxy(extraNodeModules, {
      get: (target, name) => {
        if (name in target) {
          return target[name];
        }
        return path.join(__dirname, 'node_modules', name);
      },
    }),
    blockList: [
      /\.\.\/node_modules\/react-native\/.*/,
      /\.\.\/node_modules\/react\/.*/,
    ],
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      parentNodeModules,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
