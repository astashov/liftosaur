const KNOWN_CLIENTS: Array<[RegExp, string]> = [
  [/chatgpt|openai/i, "chatgpt"],
  [/codex/i, "codex"],
  [/claude/i, "claude"],
  [/antigravity/i, "antigravity"],
  [/gemini/i, "gemini"],
  [/cursor/i, "cursor"],
  [/perplexity/i, "perplexity"],
  [/hermes/i, "hermes"],
  [/visual studio code|copilot/i, "copilot"],
];

export function McpClientSlug_fromName(clientName: string | undefined): string {
  const name = clientName || "";
  for (const [pattern, slug] of KNOWN_CLIENTS) {
    if (pattern.test(name)) {
      return slug;
    }
  }
  return "other";
}

export function McpClientSlug_connectAction(clientName: string | undefined): string {
  return `ls-mcp-connect-${McpClientSlug_fromName(clientName)}`;
}
