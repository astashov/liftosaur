if (typeof require !== "undefined" && require.extensions) {
  require.extensions[".md"] = function (module, filename) {
    const fs = require("fs");
    const content = fs.readFileSync(filename, "utf8");
    module.exports = content;
  };

  require.extensions[".grammar"] = function (module, filename) {
    const fs = require("fs");
    const content = fs.readFileSync(filename, "utf8");
    module.exports = content;
  };
}
