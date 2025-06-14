const fs = require('fs');
const path = require('path');

// Markdown files to convert
const markdownFiles = [
  { input: './llms/liftoscript.md', output: './src/generated/liftoscriptDoc.ts' },
  { input: './llms/liftoscript_examples.md', output: './src/generated/liftoscriptExamples.ts' },
];

// Grammar files to convert
const grammarFiles = [
  { input: './src/pages/planner/plannerExercise.grammar', output: './src/generated/plannerGrammar.ts' },
  { input: './liftoscript.grammar', output: './src/generated/liftoscriptGrammar.ts' },
];

// Ensure output directory exists
const outputDir = './src/generated';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Convert each markdown file
markdownFiles.forEach(({ input, output }) => {
  const content = fs.readFileSync(input, 'utf8');
  const escaped = content
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${');
  
  const tsContent = `// Auto-generated from ${input}
// Do not edit manually - run npm run build:markdown to update

export const content = \`${escaped}\`;

export default content;
`;

  fs.writeFileSync(output, tsContent);
  console.log(`✓ Generated ${output}`);
});

// Convert grammar files too
grammarFiles.forEach(({ input, output }) => {
  const content = fs.readFileSync(input, 'utf8');
  const escaped = content
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${');
  
  const tsContent = `// Auto-generated from ${input}
// Do not edit manually - run npm run build:markdown to update

export const content = \`${escaped}\`;

export default content;
`;

  fs.writeFileSync(output, tsContent);
  console.log(`✓ Generated ${output}`);
});

console.log('Build complete!');