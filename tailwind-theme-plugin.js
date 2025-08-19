const plugin = require('tailwindcss/plugin');
const semanticGenerated = require('./tailwind.semantic.generated.json');

module.exports = plugin(function({ addBase }) {
  // Generate CSS variables for semantic colors
  function flattenColors(colors, prefix = '') {
    const result = {};
    for (const [key, value] of Object.entries(colors)) {
      const varName = prefix ? `${prefix}-${key}` : key;
      if (typeof value === 'object' && value !== null) {
        Object.assign(result, flattenColors(value, varName));
      } else {
        result[`--color-${varName}`] = value;
      }
    }
    return result;
  }
  
  const lightVars = flattenColors(semanticGenerated.light);
  const darkVars = flattenColors(semanticGenerated.dark);
  
  addBase({
    ':root': lightVars,
    '.dark': darkVars
  });
});