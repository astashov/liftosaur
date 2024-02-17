const pluginRss = require("@11ty/eleventy-plugin-rss");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const { PlannerHighlighter } = require("./dist-plannerhighlighter/pages/planner/plannerHighlighter");

module.exports = function (config) {
  config.addPassthroughCopy("blog/styles");
  config.addPassthroughCopy("blog/images");
  config.addPlugin(pluginRss);
  config.addPlugin(syntaxHighlight);
  config.addPairedShortcode("plannercode", function (content) {
    return `<div class="plannercode"><div class="plannercode-content">${PlannerHighlighter.highlight(
      content.trim()
    )}</div></div>`;
  });

  config.dir = {
    input: "blog",
    output: "dist/blog",
  };
  config.pathPrefix = "/blog/";
  return config;
};
