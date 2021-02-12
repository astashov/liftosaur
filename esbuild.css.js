// @ts-check

const esbuild = require("esbuild");
const fs = require("fs");
const { PurgeCSS } = require("purgecss");

const bundles = {
  main: ["src/index.css"],
  admin: ["src/admin.css"],
  record: ["src/record.css"],
  user: ["src/user.css"],
  editor: ["src/editor.css"],
  about: ["src/about.css"],
};

async function main() {
  await Promise.all(
    Object.keys(bundles).map((out) => {
      const entryPoints = bundles[out];
      esbuild.build({
        entryPoints: entryPoints,
        bundle: true,
        outfile: `dist/${out}.css`,
        sourcemap: true,
      });
    })
  );

  const purgeCSSResults = await new PurgeCSS().purge({
    content: ["src/**/*.tsx"],
    css: Object.keys(bundles).map((o) => `dist/${o}.css`),
  });

  for (const out of Object.keys(bundles)) {
    const file = `dist/${out}.css`;
    const css = purgeCSSResults.find((r) => r.file === file).css;
    fs.writeFileSync(file, css, { encoding: "utf-8" });
  }
}

main();
