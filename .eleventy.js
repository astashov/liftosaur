module.exports = function (config) {
  config.addPassthroughCopy("blog/styles");

  config.dir = {
    input: "blog",
    output: "dist/blog"
  };
  config.pathPrefix = "/blog/";
  return config;
}