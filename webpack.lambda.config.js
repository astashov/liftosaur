const path = require("path");
const { DefinePlugin, NormalModuleReplacementPlugin, SourceMapDevToolPlugin } = require("webpack");

let commitHash, fullCommitHash;
try {
  commitHash = require("child_process").execSync("git rev-parse --short HEAD").toString().trim();
  fullCommitHash = require("child_process").execSync("git rev-parse HEAD").toString().trim();
} catch {
  fullCommitHash = process.env.CODEBUILD_RESOLVED_SOURCE_VERSION || "unknown";
  commitHash = fullCommitHash.substring(0, 7);
}

const isStage = !!process.env.STAGE;

module.exports = {
  entry: {
    run: "./lambda/run.ts",
    imageResizer: "./lambda/imageResizer.ts",
  },
  target: "node24",
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  output: {
    filename: "lambda/[name].js",
    path: path.resolve(__dirname, "dist-lambda"),
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: (info) => path.relative(__dirname, info.absoluteResourcePath),
  },
  externals: [
    { sharp: "commonjs2 sharp" },
    function ({ request }, callback) {
      if (request === "@resvg/resvg-wasm" || request.startsWith("@resvg/resvg-wasm/")) {
        return callback(null, "commonjs2 " + request);
      }
      if (request === "encoding") {
        return callback(null, "commonjs2 " + request);
      }
      callback();
    },
  ],
  externalsPresets: { node: true },
  node: {
    __dirname: false,
    __filename: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "babel-loader",
        options: {
          sourceMaps: true,
          compact: false,
          presets: [
            ["@babel/preset-env", { targets: { node: "24" }, modules: false }],
            ["@babel/preset-typescript", { isTSX: true, allExtensions: true }],
            ["@babel/preset-react", { runtime: "automatic", importSource: "nativewind" }],
          ],
        },
      },
      {
        test: /\.m?js$/,
        include: /node_modules/,
        type: "javascript/auto",
        resolve: { fullySpecified: false },
      },
    ],
  },
  resolve: {
    extensions: [".web.tsx", ".web.ts", ".web.js", ".tsx", ".ts", ".js"],
    alias: {
      "react-native$": "react-native-web",
    },
  },
  plugins: [
    new NormalModuleReplacementPlugin(/react-native-css-interop\/dist\/doctor/, require.resolve("./empty-module.js")),
    new SourceMapDevToolPlugin({
      filename: "[file].map",
      moduleFilenameTemplate: (info) => path.relative(__dirname, info.absoluteResourcePath),
      noSources: false,
    }),
    new DefinePlugin({
      "process.env.JEST_WORKER_ID": "undefined",
      __DEV__: JSON.stringify(false),
      __COMMIT_HASH__: JSON.stringify(commitHash),
      __FULL_COMMIT_HASH__: JSON.stringify(fullCommitHash),
      __ENV__: JSON.stringify("production"),
      __HOST__: JSON.stringify(isStage ? "https://stage.liftosaur.com" : "https://www.liftosaur.com"),
      __API_HOST__: JSON.stringify(isStage ? "https://api3-dev.liftosaur.com" : "https://api3.liftosaur.com"),
      __STREAMING_API_HOST__: JSON.stringify(
        isStage ? "https://streaming-api-dev.liftosaur.com" : "https://streaming-api.liftosaur.com"
      ),
    }),
  ],
  optimization: {
    minimize: false,
    splitChunks: false,
    runtimeChunk: false,
  },
};
