const pluginRss = require("@11ty/eleventy-plugin-rss");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const path = require("path");
const fs = require("fs");
const { PlannerHighlighter_highlight } = require("./dist-plannerhighlighter/pages/planner/plannerHighlighter");

module.exports = function (config) {
  config.addPassthroughCopy("blog/styles");
  config.addPassthroughCopy("blog/images");
  config.addPlugin(pluginRss);
  config.addPlugin(syntaxHighlight);
  config.addPairedShortcode("plannercode", function (content) {
    return `<div class="plannercode"><div class="plannercode-content">${PlannerHighlighter_highlight(
      content.trim()
    )}</div></div>`;
  });

  // Define the "posts" collection
  config.addCollection("posts", function (collectionApi) {
    const coll = collectionApi.getFilteredByGlob("./blog/posts/*.md").reverse();
    const outputPath = path.join(__dirname, "blog", "blog-posts.json");
    fs.writeFileSync(outputPath, JSON.stringify({ data: coll.map((c) => c.url) }, null, 2));
    return coll;
  });

  config.dir = {
    input: "blog",
    output: "dist/blog",
  };
  config.pathPrefix = "/blog/";
  return config;
};
