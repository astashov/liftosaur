---
id: mcp
title: "MCP Server"
shortDescription: "Connect AI assistants like Claude or ChatGPT to Liftosaur - create programs, log workouts, and analyze training through natural conversation."
order: 2
category: "Integrations"
datePublished: "2026-03-07"
dateModified: "2026-03-07"
---

## What is MCP?

MCP (Model Context Protocol) is an open standard that lets AI assistants connect to external tools. Liftosaur has an MCP server - so you can ask Claude, ChatGPT, or any MCP-compatible assistant to manage your programs and workout history through natural conversation.

For example, you could say "Create a 4-day upper/lower program with linear progression" and the AI will write the Liftoscript code, validate it, and save it to your account.

Requires a premium subscription.

## Connecting to Liftosaur

The Liftosaur MCP server URL is:

```
https://www.liftosaur.com/mcp
```

The server uses OAuth 2.1 for authentication. On first use, your AI client will open a browser window to sign in with your Liftosaur account. After that it handles token refresh automatically.

Below are setup instructions for each major AI platform.

### Claude.ai (Web)

1. Open [claude.ai](https://claude.ai)
2. Go to **Settings** -> **Connectors**
3. Click **Add custom connector** at the bottom
4. Paste the URL: `https://www.liftosaur.com/mcp`
5. Click **Add**
6. You'll be redirected to sign in with your Liftosaur account

After that, Liftosaur tools will be available in your conversations. You can also add it from the chat input - click the **Search and tools** menu, then **Add connectors**.

### Claude Desktop

#### Option A: Via Settings UI

1. Open Claude Desktop
2. Go to **Settings** -> **Connectors**
3. Click **Add custom connector**
4. Paste the URL: `https://www.liftosaur.com/mcp`
5. Click **Add**
6. You'll be redirected to sign in with your Liftosaur account

#### Option B: Via config file

Claude Desktop doesn't support remote servers directly via `claude_desktop_config.json`. Use the [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) package as a bridge:

1. Click the **Settings** icon (bottom-left corner)
2. Go to the **Developer** tab
3. Click **Edit Config** - this opens `claude_desktop_config.json`
4. Add the Liftosaur server:

```json
{
  "mcpServers": {
    "liftosaur": {
      "command": "npx",
      "args": ["mcp-remote", "https://www.liftosaur.com/mcp"]
    }
  }
}
```

5. Save the file and restart Claude Desktop
6. On first use, Claude will open your browser to authenticate with Liftosaur

### Claude Code

Run this command in your terminal:

```bash
claude mcp add liftosaur --transport http https://www.liftosaur.com/mcp
```

That's it. Claude Code will prompt for authentication on first use.

### ChatGPT

ChatGPT calls MCP connections "Apps" (previously "Connectors"). You'll need ChatGPT Plus, Pro, Team, Enterprise, or Edu.

1. Open ChatGPT
2. Go to **Settings** -> **Apps & Connectors**
3. Scroll down and enable **Developer Mode** under Advanced settings
4. Go to **Settings** -> **Connectors** -> **Create**
5. Fill in:
   - **Name**: Liftosaur
   - **Description**: Manage weightlifting programs and workout history
   - **Connector URL**: `https://www.liftosaur.com/mcp`
6. Click **Create**
7. ChatGPT will verify the connection and show available tools
8. On first use, you'll be redirected to sign in with your Liftosaur account

### Gemini CLI

Gemini CLI supports remote MCP servers via `settings.json`.

1. Open `~/.gemini/settings.json` (create it if it doesn't exist)
2. Add the Liftosaur server:

```json
{
  "mcpServers": {
    "liftosaur": {
      "httpUrl": "https://www.liftosaur.com/mcp",
      "authProviderType": "dynamic_discovery",
      "timeout": 30000
    }
  }
}
```

3. Start a Gemini CLI session
4. Run `/mcp` to verify the server is connected
5. On first use, run `/mcp auth liftosaur` to authenticate with your Liftosaur account

### Other MCP Clients

Any MCP-compatible client that supports Streamable HTTP transport and OAuth 2.1 can connect. Point it at:

```
https://www.liftosaur.com/mcp
```

## What Can You Do With It?

Once connected, you can ask the AI to:

- **Create programs** - describe what you want and it'll write the Liftoscript
- **Edit programs** - "Add a fourth day focused on arms" or "Change squat progression to 5/3/1"
- **Review programs** - "Is my program balanced? Am I hitting enough back volume?"
- **Log workouts** - "I did 3x5 squats at 225lb and 3x8 bench at 155lb today"
- **Analyze history** - "Show me my last 10 workouts" or "How has my squat progressed?"
- **Test progressions** - simulate workouts in the playground to verify the logic works

The AI has access to the Liftoscript language reference and built-in program examples, so it can learn the syntax on the fly.

## Available Tools

These are the tools the AI assistant can call on your behalf:

### Programs

| Tool | What it does |
|------|-------------|
| `list_programs` | List all your programs (id, name, active status) |
| `get_program` | Get a program's full Liftoscript source. Use `id=current` for the active one |
| `create_program` | Create a new program from Liftoscript code |
| `update_program` | Update an existing program's source code |
| `delete_program` | Delete a program (can't delete the active one) |

### Workout History

| Tool | What it does |
|------|-------------|
| `get_history` | List workout history records. Supports date filtering and pagination |
| `get_history_record` | Get a single workout record by ID |
| `create_history_record` | Log a new workout in Liftoscript Workouts format |
| `update_history_record` | Update an existing workout record |
| `delete_history_record` | Delete a workout record |

### Testing and Analysis

| Tool | What it does |
|------|-------------|
| `run_playground` | Simulate a workout - complete sets, run progressions, verify logic works |
| `get_program_stats` | Analyze a program: duration per day, weekly volume per muscle group, strength vs hypertrophy split |

### Reference (No Auth Required)

These tools don't need authentication - the AI can call them anytime:

| Tool | What it does |
|------|-------------|
| `get_liftoscript_reference` | Liftoscript language reference - syntax, progressions, templates |
| `get_liftoscript_examples` | Complete program examples (5/3/1, GZCLP, PPL, etc.) |
| `get_liftohistory_reference` | Liftoscript Workouts format reference for workout records |
| `list_exercises` | All built-in exercise names and equipment variants |
| `list_builtin_programs` | List of built-in programs available in the app |
| `get_builtin_program` | Full source of a built-in program - great for learning Liftoscript |

## Example Conversations

**Creating a program:**
> "Create a 3-day full body program for a beginner. Linear progression, compound lifts only. Start with light weights."

The AI will read the Liftoscript reference, write the program, test it in the playground, and save it to your account.

**Analyzing your training:**
> "Pull my last month of workouts and tell me if I'm progressing on squat."

The AI fetches your history, looks at the weights and reps over time, and gives you feedback.

**Tweaking a program:**
> "My current program doesn't have enough back work. Add pull-ups and barbell rows."

The AI reads your current program, modifies the Liftoscript to add the exercises with appropriate progression, and saves the update.

## Tips

- The AI should read `get_liftoscript_reference` before writing any program. If it doesn't, remind it.
- Use `run_playground` to test before saving. Catches syntax errors and lets you verify progressions work.
- `get_program_stats` is useful for checking program balance - volume per muscle group, session duration, etc.
- Built-in programs (`list_builtin_programs` + `get_builtin_program`) are great examples for the AI to learn from.

## REST API

If you want direct programmatic access instead of going through an AI assistant, Liftosaur also has a [REST API](/docs/api) with the same capabilities. Generate an API key in Settings and make HTTP requests directly.
