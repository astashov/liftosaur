const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

const path = require("path");
const fs = require("fs");
const { DefinePlugin, SourceMapDevToolPlugin } = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const commitHash = require("child_process").execSync("git rev-parse --short HEAD").toString().trim();
const fullCommitHash = require("child_process").execSync("git rev-parse HEAD").toString().trim();

// Export a function. Accept the base config as the only param.
module.exports = {
  entry: {
    main: ["./src/main.tsx", "./src/index.css"],
    login: ["./src/login.tsx", "./src/index.css"],
    exercise: ["./src/exercise.tsx", "./src/index.css"],
    allexercises: ["./src/allExercises.tsx", "./src/index.css"],
    app: ["./src/index.tsx", "./src/index.css"],
    admin: ["./src/admin.tsx", "./src/admin.css"],
    record: ["./src/record.tsx", "./src/record.css", "./src/index.css"],
    user: ["./src/user.tsx", "./src/user.css", "./src/index.css"],
    programdetails: ["./src/programDetails.tsx", "./src/programDetails.css", "./src/index.css"],
    planner: ["./src/planner.tsx", "./src/planner.css", "./src/index.css"],
    program: ["./src/program.tsx", "./src/program.css", "./src/index.css"],
    programsList: ["./src/programsList.tsx", "./src/program.css", "./src/index.css"],
    editor: ["./src/editor.ts", "./src/editor.css"],
    affiliatedashboard: ["./src/affiliatedashboard.tsx", "./src/affiliatedashboard.css", "./src/index.css"],
    affiliates: ["./src/affiliates.tsx", "./src/page.css", "./src/index.css"],
    usersdashboard: ["./src/usersdashboard.tsx", "./src/page.css", "./src/index.css"],
    "webpushr-sw": "./src/webpushr-sw.ts",
  },
  output: {
    filename: "[name].js",
    publicPath: "/",
    path: path.resolve(__dirname, "dist"),
  },
  devtool: false,
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
      },
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
              configFile: "tsconfig.json",
            },
          },
        ],
      },
      {
        test: /\.esm.js$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: (chunk) => chunk.name === "app",
        },
      },
    },
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".css"],
  },
  plugins: [
    new SourceMapDevToolPlugin({
      append: `\n//# sourceMappingURL=[file].map?version=${commitHash}`,
      filename: "[file].map",
    }),
    new MiniCssExtractPlugin(),
    new DefinePlugin({
      __COMMIT_HASH__: JSON.stringify(commitHash),
      __FULL_COMMIT_HASH__: JSON.stringify(fullCommitHash),
      __API_HOST__: JSON.stringify(
        process.env.NODE_ENV === "production"
          ? process.env.STAGE
            ? "https://api3-dev.liftosaur.com"
            : "https://api3.liftosaur.com"
          : "https://local-api.liftosaur.com:3000"
      ),
      __ENV__: JSON.stringify(process.env.NODE_ENV === "production" ? "production" : "development"),
      __HOST__: JSON.stringify(
        process.env.NODE_ENV === "production"
          ? process.env.STAGE
            ? "https://stage.liftosaur.com"
            : "https://www.liftosaur.com"
          : "https://local.liftosaur.com:8080"
      ),
    }),
    new CopyPlugin([
      {
        from: `src/index.html`,
        to: `app/index.html`,
        transform: (content) => {
          return content
            .toString()
            .replace(/\?version=xxxxxxxx/g, `?version=${commitHash}`)
            .replace(/\?vendor=xxxxxxxx/g, `?vendor=${commitHash}`);
        },
      },
      {
        from: process.env.STAGE ? "_redirects_staging" : "_redirects",
        to: "./_redirects",
        toType: "file",
      },
      {
        from: process.env.STAGE ? "robots_stage.txt" : "robots_prod.txt",
        to: "./robots.txt",
        toType: "file",
      },
      {
        from: "_headers",
        to: "",
      },
      {
        from: `src/editor.html`,
        to: `editor.html`,
      },
      {
        from: `docs`,
        to: `docs`,
      },
      {
        from: `src/googleauthcallback.html`,
        to: `googleauthcallback.html`,
      },
      {
        from: `src/liftosaur_example_csv.zip`,
        to: `liftosaur_example_csv.zip`,
      },
      {
        from: `src/privacy.html`,
        to: `privacy.html`,
      },
      {
        from: `src/terms.html`,
        to: `terms.html`,
      },
      {
        from: `src/licenses.html`,
        to: `licenses.html`,
      },
      {
        from: `src/sitemap.txt`,
        to: `sitemap.txt`,
      },
      {
        from: `src/notification.m4r`,
        to: `notification.m4r`,
      },
      {
        from: "icons",
        to: "icons",
      },
      {
        from: "fonts",
        to: "fonts",
      },
      {
        from: "images",
        to: "images",
      },
      {
        from: "manifest.webmanifest",
        to: "manifest.webmanifest",
      },
      {
        from: "assetlinks.json",
        to: ".well-known/assetlinks.json",
      },
      {
        from: "apple-app-site-association",
        to: ".well-known",
      },
    ]),
    new BundleAnalyzerPlugin({ analyzerMode: "static", openAnalyzer: false }),
  ],
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  devServer: {
    devMiddleware: {
      index: false, // specify to enable root proxying
    },
    static: path.join(__dirname, "dist"),
    compress: true,
    https:
      process.env.NODE_ENV === "production"
        ? undefined
        : {
            key: fs.readFileSync(path.join(process.env.HOME, ".secrets/live/local.liftosaur.com/privkey.pem")),
            cert: fs.readFileSync(path.join(process.env.HOME, ".secrets/live/local.liftosaur.com/fullchain.pem")),
          },
    hot: false,
    allowedHosts: "all",
    liveReload: false,
    host: "0.0.0.0",
    proxy: {
      "/p/*": {
        target: "https://local-api.liftosaur.com:3000/",
        secure: false,
      },
      "/docs": {
        target: "https://local.liftosaur.com:8080/blog",
        secure: false,
      },
      "/about": {
        target: "https://local-api.liftosaur.com:3000/",
        pathRewrite: (p, req) => {
          return "/main";
        },
        secure: false,
      },
      "/n/*": {
        target: "https://local-api.liftosaur.com:3000/",
        secure: false,
      },
      "/record": {
        target: "https://local-api.liftosaur.com:3000/api",
        secure: false,
      },
      "/admin": {
        target: "https://local-api.liftosaur.com:3000/",
        secure: false,
      },
      "/profileimage/*": {
        target: "https://local-api.liftosaur.com:3000",
        secure: false,
        pathRewrite: (p, req) => {
          const user = p.replace(/^\//, "").replace(/\/$/, "").split("/")[1];
          return `/profileimage?user=${user}`;
        },
      },
      "/profile/*": {
        target: "https://local-api.liftosaur.com:3000",
        secure: false,
        pathRewrite: (p, req) => {
          const user = p.replace(/^\//, "").replace(/\/$/, "").split("/")[1];
          return `/profile?user=${user}`;
        },
      },
      "/programs/*": {
        target: "https://0.0.0.0:3000",
        secure: false,
      },
      "/planner": {
        target: "https://local-api.liftosaur.com:3000/",
        secure: false,
      },
      "/dashboards/affiliates/*": {
        target: "https://local-api.liftosaur.com:3000/",
        secure: false,
      },
      "/externalimages/*": {
        target: "https://www.liftosaur.com/",
        secure: true,
        changeOrigin: true,
      },
      "/dashboards/users": {
        target: "https://local-api.liftosaur.com:3000/",
        secure: false,
      },
      "/login": {
        target: "https://local-api.liftosaur.com:3000/",
        secure: false,
      },
      "/exercises": {
        target: "https://local-api.liftosaur.com:3000/",
        secure: false,
      },
      "/exercises/*": {
        target: "https://local-api.liftosaur.com:3000/",
        secure: false,
      },
      "/program": {
        target: "https://local-api.liftosaur.com:3000/",
        secure: false,
      },
      "/user/*": {
        target: "https://local-api.liftosaur.com:3000/",
        secure: false,
      },
      "/affiliates": {
        target: "https://local-api.liftosaur.com:3000/",
        secure: false,
      },
      "/programimage/*": {
        target: "https://local-api.liftosaur.com:3000/api",
        secure: false,
      },
      "/user/programs": {
        target: "https://local-api.liftosaur.com:3000/",
        secure: false,
      },
      "/": {
        target: "https://local-api.liftosaur.com:3000/",
        bypass: function (req, res, proxyOptions) {
          // If the request is not for the root path, bypass the proxy
          if (req.path !== "/") {
            return req.path;
          }
        },
        pathRewrite: (p, req) => {
          console.log(p);
          const url = new URL(p, "https://www.example.com");
          if (url.pathname === "/") {
            return "/main";
          } else {
            return p;
          }
        },
        secure: false,
      },
    },
  },
};
