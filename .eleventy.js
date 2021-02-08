const pluginRss = require("@11ty/eleventy-plugin-rss");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

module.exports = function (config) {
  config.addPassthroughCopy("blog/styles");
  config.addPassthroughCopy("blog/images");
  config.addPlugin(pluginRss);
  config.addPlugin(syntaxHighlight);

  config.dir = {
    input: "blog",
    output: "dist/blog"
  };
  config.pathPrefix = "/blog/";
  return config;
}