const plugin = require('tailwindcss/plugin');

module.exports = plugin(function({ addBase, theme }) {
  function extractColorVars(colorObj, colorGroup = '') {
    return Object.entries(colorObj).reduce((vars, [key, value]) => {
      const cssVariable = colorGroup
        ? `--color-${colorGroup}-${key}`
        : `--color-${key}`;

      if (typeof value === 'string') {
        vars[cssVariable] = value;
      } else if (typeof value === 'object') {
        // Handle nested color objects
        const nestedVars = extractColorVars(value, colorGroup ? `${colorGroup}-${key}` : key);
        return { ...vars, ...nestedVars };
      }

      return vars;
    }, {});
  }

  const colors = theme('colors');
  const colorVars = extractColorVars(colors);

  addBase({
    ':root': colorVars
  });
});