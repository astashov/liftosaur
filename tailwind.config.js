const baseColors = require("./tailwind.colors.json");
const semanticGenerated = require("./tailwind.semantic.generated.json");
const cssVariablesPlugin = require("./tailwind-css-variables");

// Create semantic colors that reference CSS variables
function createSemanticColors() {
  const colors = {};
  
  function processObject(obj, prefix = '') {
    const output = {};
    for (const [key, value] of Object.entries(obj)) {
      const varName = prefix ? `${prefix}-${key}` : key;
      if (typeof value === 'object' && value !== null) {
        output[key] = processObject(value, varName);
      } else {
        // Reference CSS variable
        output[key] = `var(--color-${varName})`;
      }
    }
    return output;
  }
  
  return processObject(semanticGenerated.light);
}

// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.tsx", "./src/utils/*.ts"],
  safelist: [
    "line-clamp-1",
    "line-clamp-2",
    "line-clamp-3",
    "line-clamp-4",
    "line-clamp-5",
    "line-clamp-6",
    "line-clamp-none"
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Base colors
        ...baseColors,
        // Semantic colors that reference CSS variables
        ...createSemanticColors()
      },
      fontFamily: { "sans": ["Poppins", "sans-serif"], "serif": ["Poppins", "serif"] },
      borderRadius: { "xl": "0.75rem", "2xl": "1rem", "3xl": "1.5rem" }
    }
  },
  plugins: [
    cssVariablesPlugin,
    // Plugin to generate CSS variables for light/dark themes
    require('./tailwind-theme-plugin')
  ]
};
