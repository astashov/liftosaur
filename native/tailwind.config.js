const baseColors = require('../tailwind.colors.json');
const webConfigJson = require('../tailwind.config.json');
const semanticGenerated = require('../tailwind.semantic.generated.json');

function resolveSemanticColors(theme) {
  const output = {};
  for (const [key, value] of Object.entries(theme)) {
    if (typeof value === 'object' && value !== null) {
      output[key] = resolveSemanticColors(value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  content: ['./src/**/*.tsx', './App.tsx'],
  theme: {
    extend: {
      colors: {
        ...baseColors,
        ...webConfigJson.theme.extend.colors,
        ...resolveSemanticColors(semanticGenerated.light),
      },
      fontFamily: { sans: ['Poppins', 'sans-serif'], serif: ['Poppins', 'serif'] },
      borderRadius: { xl: '0.75rem', '2xl': '1rem', '3xl': '1.5rem' },
    },
  },
  plugins: [],
};
