module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === "production"
      ? {
          "@fullhuman/postcss-purgecss": {
            content: ["./src/**/*.tsx", "./src/utils/*.ts"],
            defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
          },
          cssnano: {},
        }
      : {}),
  },
};
