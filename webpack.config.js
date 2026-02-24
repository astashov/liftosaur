const { main: localdomain, api: localapidomain, streamingapi: localstreamingapidomain } = require("./localdomain");

const path = require("path");
const fs = require("fs");
const { DefinePlugin, SourceMapDevToolPlugin } = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
let commitHash, fullCommitHash;
try {
  commitHash = require("child_process").execSync("git rev-parse --short HEAD").toString().trim();
  fullCommitHash = require("child_process").execSync("git rev-parse HEAD").toString().trim();
} catch {
  fullCommitHash = process.env.CODEBUILD_RESOLVED_SOURCE_VERSION || "unknown";
  commitHash = fullCommitHash.substring(0, 7);
}
const bundleVersionIos = 1;
const bundleVersionAndroid = 1;
const bundleVersionWatchIos = 1;
const bundleVersionWatchAndroid = 1;

const localapi = `https://${localapidomain}.liftosaur.com:3000/`;
const local = `https://${localdomain}.liftosaur.com:8080/`;

const isDev = process.env.NODE_ENV !== "production";

const watchConfig = {
  entry: "./src/watch/index.ts",
  target: "node",
  output: {
    filename: "watch-bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  devtool: false,
  module: {
    rules: [
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
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  plugins: [
    new DefinePlugin({
      window: "globalThis",
      __BUNDLE_VERSION_WATCH_IOS__: bundleVersionWatchIos,
      __BUNDLE_VERSION_WATCH_ANDROID__: bundleVersionWatchAndroid,
      __COMMIT_HASH__: JSON.stringify(commitHash),
      __FULL_COMMIT_HASH__: JSON.stringify(fullCommitHash),
      __HOST__: JSON.stringify(
        process.env.NODE_ENV === "production"
          ? process.env.STAGE
            ? "https://stage.liftosaur.com"
            : "https://www.liftosaur.com"
          : local
      ),
      __ENV__: JSON.stringify(process.env.NODE_ENV === "production" ? "production" : "development"),
    }),
  ],
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
};

const mainConfig = {
  entry: {
    main: ["./src/main.tsx", "./src/index.css"],
    login: ["./src/login.tsx", "./src/index.css"],
    exercise: ["./src/exercise.tsx", "./src/index.css"],
    repmax: ["./src/repmax.tsx", "./src/index.css"],
    allexercises: ["./src/allExercises.tsx", "./src/index.css"],
    allprograms: ["./src/allPrograms.tsx", "./src/index.css"],
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
    useraffiliates: ["./src/useraffiliates.tsx", "./src/page.css", "./src/index.css"],
    ai: ["./src/ai.tsx", "./src/page.css", "./src/index.css"],
    aiPrompt: ["./src/aiPrompt.tsx", "./src/page.css", "./src/index.css"],
    userdashboard: ["./src/userdashboard.tsx", "./src/page.css", "./src/index.css"],
    usersdashboard: ["./src/usersdashboard.tsx", "./src/page.css", "./src/index.css"],
    paymentsdashboard: ["./src/paymentsdashboard.tsx", "./src/page.css", "./src/index.css"],
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
      append: `\n//# sourceMappingURL=[name].js.map?version=${commitHash}`,
      filename: "[file].map",
    }),
    new MiniCssExtractPlugin({ filename: "[name].css" }),
    new DefinePlugin({
      __BUNDLE_VERSION_IOS__: bundleVersionIos,
      __BUNDLE_VERSION_ANDROID__: bundleVersionAndroid,
      __COMMIT_HASH__: JSON.stringify(commitHash),
      __FULL_COMMIT_HASH__: JSON.stringify(fullCommitHash),
      __API_HOST__: JSON.stringify(
        process.env.NODE_ENV === "production"
          ? process.env.STAGE
            ? "https://api3-dev.liftosaur.com"
            : "https://api3.liftosaur.com"
          : `https://${localapidomain}.liftosaur.com:3000`
      ),
      __STREAMING_API_HOST__: JSON.stringify(
        process.env.NODE_ENV === "production"
          ? process.env.STAGE
            ? "https://streaming-api-dev.liftosaur.com"
            : "https://streaming-api.liftosaur.com"
          : `https://${localstreamingapidomain}.liftosaur.com:3001`
      ),
      __ENV__: JSON.stringify(process.env.NODE_ENV === "production" ? "production" : "development"),
      __HOST__: JSON.stringify(
        process.env.NODE_ENV === "production"
          ? process.env.STAGE
            ? "https://stage.liftosaur.com"
            : "https://www.liftosaur.com"
          : `https://${localdomain}.liftosaur.com:8080`
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
        from: `src/healthconnectprivacypolicy.html`,
        to: `healthconnectprivacypolicy.html`,
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
        from: `src/sitemap.xml`,
        to: `sitemap.xml`,
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
        from: "programdata",
        to: "programdata",
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
    // new BundleAnalyzerPlugin({ analyzerMode: "static", openAnalyzer: false }),
  ],
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  devServer: {
    devMiddleware: {
      index: false, // specify to enable root proxying
    },
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
    },
    static: path.join(__dirname, "dist"),
    compress: true,
    https:
      process.env.NODE_ENV === "production"
        ? undefined
        : {
            key: fs.readFileSync(path.join(process.env.HOME, `.secrets/live/${localdomain}.liftosaur.com/privkey.pem`)),
            cert: fs.readFileSync(
              path.join(process.env.HOME, `.secrets/live/${localdomain}.liftosaur.com/fullchain.pem`)
            ),
          },
    hot: false,
    allowedHosts: "all",
    liveReload: false,
    host: "0.0.0.0",
    proxy: {
      "/p/*": {
        target: localapi,
        secure: false,
      },
      "/docs": {
        target: local + "/blog",
        secure: false,
      },
      "/about": {
        target: localapi,
        pathRewrite: (p, req) => {
          return "/main";
        },
        secure: false,
      },
      "/n/*": {
        target: localapi,
        secure: false,
      },
      "/record": {
        target: localapi + "/api",
        secure: false,
      },
      "/admin": {
        target: localapi,
        secure: false,
      },
      "/profileimage/*": {
        target: localapi,
        secure: false,
        pathRewrite: (p, req) => {
          const user = p.replace(/^\//, "").replace(/\/$/, "").split("/")[1];
          return `/profileimage?user=${user}`;
        },
      },
      "/profile/*": {
        target: localapi,
        secure: false,
        pathRewrite: (p, req) => {
          const user = p.replace(/^\//, "").replace(/\/$/, "").split("/")[1];
          return `/profile?user=${user}`;
        },
      },
      "/programs/*": {
        target: localapi,
        secure: false,
      },
      "/planner": {
        target: localapi,
        secure: false,
      },
      "/dashboards/affiliates/*": {
        target: localapi,
        secure: false,
      },
      "/externalimages/*": {
        target: "https://www.liftosaur.com/",
        secure: true,
        changeOrigin: true,
      },
      "/dashboards/users": {
        target: localapi,
        secure: false,
      },
      "/dashboards/user/*": {
        target: localapi,
        secure: false,
      },
      "/dashboards/payments": {
        target: localapi,
        secure: false,
      },
      "/login": {
        target: localapi,
        secure: false,
      },
      "/exercises": {
        target: localapi,
        secure: false,
      },
      "/rep-max-calculator": { target: localapi, secure: false },
      "/one-rep-max-calculator": { target: localapi, secure: false },
      "/two-rep-max-calculator": { target: localapi, secure: false },
      "/three-rep-max-calculator": { target: localapi, secure: false },
      "/four-rep-max-calculator": { target: localapi, secure: false },
      "/five-rep-max-calculator": { target: localapi, secure: false },
      "/six-rep-max-calculator": { target: localapi, secure: false },
      "/seven-rep-max-calculator": { target: localapi, secure: false },
      "/eight-rep-max-calculator": { target: localapi, secure: false },
      "/nine-rep-max-calculator": { target: localapi, secure: false },
      "/ten-rep-max-calculator": { target: localapi, secure: false },
      "/evelen-rep-max-calculator": { target: localapi, secure: false },
      "/twelve-rep-max-calculator": { target: localapi, secure: false },
      "/rm": { target: localapi, secure: false },
      "/1rm": { target: localapi, secure: false },
      "/2rm": { target: localapi, secure: false },
      "/3rm": { target: localapi, secure: false },
      "/4rm": { target: localapi, secure: false },
      "/5rm": { target: localapi, secure: false },
      "/6rm": { target: localapi, secure: false },
      "/7rm": { target: localapi, secure: false },
      "/8rm": { target: localapi, secure: false },
      "/9rm": { target: localapi, secure: false },
      "/10rm": { target: localapi, secure: false },
      "/11rm": { target: localapi, secure: false },
      "/12rm": { target: localapi, secure: false },
      "/exercises/*": {
        target: localapi,
        secure: false,
      },
      "/.well-known/skadnetwork/report-attribution": {
        pathRewrite: { "^/.well-known/skadnetwork/report-attribution": "/api/adattr" },
        target: localapi,
        secure: false,
      },
      "/program": {
        target: localapi,
        secure: false,
        bypass: function (req) {
          if (req.path.startsWith("/programdata")) {
            return req.path;
          }
        },
      },
      "/user/*": {
        target: localapi,
        secure: false,
      },
      "/affiliates": {
        target: localapi,
        secure: false,
      },
      "/ai": {
        target: localapi,
        secure: false,
      },
      "/programimage/*": {
        target: localapi + "/api",
        secure: false,
      },
      "/user/programs": {
        target: localapi,
        secure: false,
      },
      "/": {
        target: localapi,
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

module.exports = [mainConfig, watchConfig];
