const path = require("path");
const { DefinePlugin } = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const commitHash = require("child_process")
  .execSync("git rev-parse --short HEAD")
  .toString()
  .trim();

// Export a function. Accept the base config as the only param.
module.exports = {
  entry: {
    main: ["./src/index.tsx", "./src/index.css"],
    "webpushr-sw": "./src/webpushr-sw.ts"
  },
  output: {
    filename: "[name].js",
    publicPath: "/",
    path: path.resolve(__dirname, "dist")
  },
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"]
      },
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
              configFile: "tsconfig.json"
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".css"]
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new DefinePlugin({
      __COMMIT_HASH__: JSON.stringify(commitHash),
      __API_HOST__: JSON.stringify(
        process.env.NODE_ENV === "production"
          ? "https://server-production.liftosaur.workers.dev"
          : "http://localhost:8787"
      )
    }),
    new CopyPlugin([
      {
        from: `src/index.html`,
        to: `index.html`,
        transform: content => {
          return content.toString().replace(/\?version=xxxxxxxx/g, `?version=${commitHash}`);
        }
      },
      {
        from: "icons",
        to: "icons"
      },
      {
        from: "manifest.webmanifest",
        to: "manifest.webmanifest"
      }
    ])
  ],
  devServer: {
    contentBase: path.join(__dirname, "dist"),
    compress: true,
    hot: false,
    inline: false,
    liveReload: false,
    host: "0.0.0.0",
    disableHostCheck: true
  }
};
