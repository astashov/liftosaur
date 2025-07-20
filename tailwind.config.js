const json = require("./tailwind.config.json");
const cssVariablesPlugin = require("./tailwind-css-variables");

// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  ...json,
  plugins: [cssVariablesPlugin]
};
