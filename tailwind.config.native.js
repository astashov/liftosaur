const path = require("path");
const baseColors = require("./tailwind.colors.json");
const semanticGenerated = require("./tailwind.semantic.generated.json");
const nativewindPreset = require("nativewind/preset");

function createSemanticColors() {
  function processObject(obj, prefix = "") {
    const output = {};
    for (const [key, value] of Object.entries(obj)) {
      const varName = prefix ? `${prefix}-${key}` : key;
      if (typeof value === "object" && value !== null) {
        output[key] = processObject(value, varName);
      } else {
        output[key] = `var(--color-${varName})`;
      }
    }
    return output;
  }
  return processObject(semanticGenerated.light);
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [path.resolve(__dirname, "src/**/*.native.tsx"), path.resolve(__dirname, "src/**/*.tsx")],
  presets: [nativewindPreset],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ...baseColors,
        ...createSemanticColors(),
      },
      fontFamily: { sans: ["Poppins", "sans-serif"], serif: ["Poppins", "serif"] },
      borderRadius: { xl: "0.75rem", "2xl": "1rem", "3xl": "1.5rem" },
    },
  },
  plugins: [require("./tailwind-theme-plugin")],
};
