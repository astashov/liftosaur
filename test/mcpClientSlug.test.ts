import "mocha";
import { expect } from "chai";
import { McpClientSlug_connectAction, McpClientSlug_fromName } from "../lambda/mcp/mcpClientSlug";

describe("McpClientSlug", () => {
  it("maps the client names seen in lftOauthClients", () => {
    expect(McpClientSlug_fromName("ChatGPT")).to.equal("chatgpt");
    expect(McpClientSlug_fromName("Claude")).to.equal("claude");
    expect(McpClientSlug_fromName("claude-code")).to.equal("claude");
    expect(McpClientSlug_fromName("Codex")).to.equal("codex");
    expect(McpClientSlug_fromName("Google Antigravity")).to.equal("antigravity");
    expect(McpClientSlug_fromName("antigravity-client")).to.equal("antigravity");
    expect(McpClientSlug_fromName("Gemini CLI MCP Client")).to.equal("gemini");
    expect(McpClientSlug_fromName("Visual Studio Code")).to.equal("copilot");
    expect(McpClientSlug_fromName("GitHub Copilot CLI")).to.equal("copilot");
  });

  it("puts unknown and missing names under other", () => {
    expect(McpClientSlug_fromName("mcporter (liftosaur)")).to.equal("other");
    expect(McpClientSlug_fromName(undefined)).to.equal("other");
    expect(McpClientSlug_fromName("")).to.equal("other");
  });

  it("builds one log action per client", () => {
    expect(McpClientSlug_connectAction("ChatGPT")).to.equal("ls-mcp-connect-chatgpt");
    expect(McpClientSlug_connectAction("MCP Client")).to.equal("ls-mcp-connect-other");
  });
});
