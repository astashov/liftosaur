// const purgecss = require("@fullhuman/postcss-purgecss")({
//   content: ["./src/**/*.tsx"],
//   defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
// });

module.exports = {
  plugins: [
    require("tailwindcss"),
    require("autoprefixer"),
    // purgecss,
    require("cssnano")
  ]
};
