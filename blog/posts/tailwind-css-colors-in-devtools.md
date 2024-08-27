---
date: "2021-03-06"
title: Tailwind CSS colors in Chrome Devtools
og_title: Tailwind CSS colors in Chrome Devtools | Liftosaur blog
og_description: "How to export Tailwind CSS colors as CSS variables in devtools"
og_image: /images/tailwind-css-colors-in-devtools-intro.png
tags: ["tech"]
twitter: https://twitter.com/liftosaur/status/1368627453112029188
reddit: https://www.reddit.com/r/liftosaur/comments/lzvo3n/how_to_add_tailwind_css_colors_to_chrome_devtools/
---

<img style="box-shadow: 0 0 18px 4px rgba(0, 0, 0, 0.1); margin: 15px 0 60px" src="../../images/tailwind-css-colors-in-devtools-intro.png" width="100%" alt="Tailwind colors in devtools" />

I like to prototype designs or experiment with UI right in the browser.
For Liftosaur, I use Tailwind CSS to style the app. What I was really missing is the ability to specify the colors from my Tailwind CSS theme in devtools.

Apparently, it's pretty easy to add them though. You probably have a `tailwind.config.js` file in your project directory (if not, just create it with `module.exports = {};`). Then, you could use a script like this:

```js
const resolveConfig = require("tailwindcss/resolveConfig");
const tailwindConfig = require("./tailwind.config.js");

const fullConfig = resolveConfig(tailwindConfig);

let output = ":root {\n";
for (const key of Object.keys(fullConfig.theme.colors)) {
  const value = fullConfig.theme.colors[key];
  if (typeof value === "string") {
    output += `  --${key}: ${value};\n`;
  } else {
    for (const colorKey of Object.keys(value)) {
      const colorValue = value[colorKey];
      output += `  --${key}-${colorKey}: ${colorValue};\n`;
    }
  }
}
output += "}\n";

console.log(output);
```

And run it like:

```bash
$ node tw.js > colors.css
```

It will generate a file with a bunch of CSS variables with colors from your theme. Copy the contents of `colors.css` to your app's CSS file. And you'll be able to use those in devtools:

<video style="width: 100%" playsinline muted autoplay loop src="../../images/tailwind-css-colors-in-devtools-video.mp4"></video>
