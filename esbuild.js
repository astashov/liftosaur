const fs = require("fs");
const util = require("util");
const path = require("path");
const { PurgeCSS } = require("purgecss");

const esbuild = require("esbuild");
const postcss = require("postcss");

const commitHash = require("child_process").execSync("git rev-parse --short HEAD").toString().trim();

const bundles = {
  main: ["src/index.tsx"],
  admin: ["src/admin.tsx"],
  record: ["src/record.tsx"],
  user: ["src/user.tsx"],
  editor: ["src/editor.ts"],
  "webpushr-sw": ["src/webpushr-sw.ts"],
};

for (const out of Object.keys(bundles)) {
  const entryPoints = bundles[out];
  esbuild.build({
    entryPoints: entryPoints,
    bundle: true,
    outfile: `dist/${out}.js`,
    minify: true,
    sourcemap: true,
    define: {
      __COMMIT_HASH__: JSON.stringify(commitHash),
      __API_HOST__: JSON.stringify(
        process.env.NODE_ENV === "production" ? "https://api.liftosaur.com" : "http://local-api.liftosaur.com:8787"
      ),
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV === "production" ? "production" : "development"),
      __ENV__: JSON.stringify(process.env.NODE_ENV === "production" ? "production" : "development"),
      __HOST__: JSON.stringify(
        process.env.NODE_ENV === "production" ? "https://www.liftosaur.com" : "http://local.liftosaur.com:8080"
      ),
    },
  });
}

const filesToCopy = [
  {
    from: `src/index.html`,
    to: `index.html`,
  },
  {
    from: "_redirects",
    to: "_redirects",
  },
  {
    from: `src/editor.html`,
    to: `editor.html`,
  },
  {
    from: `src/about.html`,
    to: `about/index.html`,
  },
  {
    from: `src/about.css`,
    to: `about.css`,
  },
  {
    from: `src/record.css`,
    to: `record.css`,
  },
  {
    from: `src/user.css`,
    to: `user.css`,
  },
  {
    from: `src/admin.css`,
    to: `admin.css`,
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
    from: `src/privacy.html`,
    to: `privacy.html`,
  },
  {
    from: `src/terms.html`,
    to: `terms.html`,
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
];

for (const file of filesToCopy) {
  const dir = path.resolve(__dirname);
  const src = path.join(dir, file.from);
  const destination = path.dirname(path.join(dir, "dist", file.to));
  fs.mkdirSync(destination, { recursive: true });
  if (fs.lstatSync(src).isDirectory()) {
  } else {
    fs.copyFileSync(src, path.join(dir, "dist", file.to));
  }
}

const ignoreOnResolvePlugin = {
  name: "ignoreOnResolve",
  setup(build) {
    build.onResolve({ filter: /(.woff|.woff2|.png|.svg)$/ }, (args) => {
      return { path: args.path, external: true };
    });
  },
};

const cssbundles = {
  main: ["src/index.css"],
  admin: ["src/admin.css"],
  record: ["src/record.css"],
  user: ["src/user.css"],
  editor: ["src/editor.css"],
  about: ["src/about.css"],
};

async function main() {
  await Promise.all(
    Object.keys(cssbundles).map((out) => {
      const entryPoints = cssbundles[out];
      return esbuild.build({
        entryPoints: entryPoints,
        plugins: [ignoreOnResolvePlugin],
        bundle: true,
        outfile: `dist/${out}.css`,
        sourcemap: true,
      });
    })
  );

  const purgeCSSResults = await new PurgeCSS().purge({
    content: ["src/**/*.tsx"],
    css: Object.keys(cssbundles).map((o) => `dist/${o}.css`),
  });

  for (const out of Object.keys(cssbundles)) {
    const file = `dist/${out}.css`;
    const css = purgeCSSResults.find((r) => r.file === file).css;
    fs.writeFileSync(file, css, { encoding: "utf-8" });
  }
}

main();
