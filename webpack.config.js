const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

// Export a function. Accept the base config as the only param.
module.exports = {
  entry: ["./src/index.tsx", "./src/index.css"],
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
              transpileOnly: true
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
    new CopyPlugin([
      {
        from: `src/index.html`,
        to: `index.html`
      },
      {
        from: 'icons',
        to: 'icons'
      },
      {
        from: 'manifest.webmanifest',
        to: 'manifest.webmanifest'
      }
    ])
  ],
  devServer: {
    contentBase: path.join(__dirname, "dist"),
    compress: true,
    hot: false,
    inline: false,
    liveReload: false
  }
};
