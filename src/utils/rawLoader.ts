// Simple raw text loader for webpack
export default function rawLoader(content: string): string {
  return `export default ${JSON.stringify(content)}`;
}
