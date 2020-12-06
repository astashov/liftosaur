const path = require("path");

// Export a function. Accept the base config as the only param.
module.exports = {
  entry: {
    index: "./server/src/index.ts",
  },
  output: {
    filename: "worker.js",
    path: path.resolve(__dirname, "worker"),
  },
  target: "webworker",
  mode: "development",
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
              configFile: "tsconfig.server.json",
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
};
