const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {withNativeWind} = require('nativewind/metro');

const parentDir = path.resolve(__dirname, '..');
const parentNodeModules = path.resolve(parentDir, 'node_modules');

const crossplatformDir = path.resolve(parentDir, 'crossplatform');

const sharedDeps = [
  'io-ts',
  'fp-ts',
  'lens-shmens',
  'dequal',
  'rollbar',
  'deepmerge',
  'micro-memoize',
];

const extraNodeModules = {
  react: path.resolve(__dirname, 'node_modules', 'react'),
  'react-native': path.resolve(__dirname, 'node_modules', 'react-native'),
};
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
      new RegExp(parentNodeModules.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/react-native/.*'),
      new RegExp(parentNodeModules.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/react/.*'),
    ],
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      parentNodeModules,
    ],
  },
};

module.exports = withNativeWind(mergeConfig(getDefaultConfig(__dirname), config), {
  input: './global.css',
});
