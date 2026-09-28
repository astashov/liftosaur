---
id: ai-and-mcp
title: "Using AI with Liftosaur"
shortDescription: "Connect Claude, ChatGPT or Gemini to your account through the MCP server, and ask it to write programs, log workouts and analyze your history."
category: "Sharing and data"
order: 80
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [ai-and-mcp-api-keys, ai-and-mcp-api-key-created]
---

## What an assistant can do

Liftosaur has an MCP server. MCP (Model Context Protocol) is an open standard that lets an AI assistant call tools in another app. Once connected, Claude, ChatGPT, Gemini or any other MCP client can work on your account through normal conversation.

The assistant gets these tools:

- **Programs**: list your programs, read a program's Liftoscript source, create a program, update it, or delete it.
- **Workout history**: list your workouts with date filters, read one workout, log a new workout, edit one, or delete one.
- **Custom exercises**: list, read, create, update and delete your custom exercises.
- **Gyms and equipment**: list your gyms, add one, rename one or make it current, and edit bars, plates and fixed weights.
- **Exercise settings**: read and set your 1RM, weight rounding, equipment and notes per exercise.
- **Measurements**: read your bodyweight, body part and body fat history, add a value, edit one, or delete one.
- **Testing and analysis**: `run_playground` simulates a workout to check that a progression works. `get_program_stats` reports duration per day, weekly volume per muscle group, and the strength vs hypertrophy split.
- **Reference**: the Liftoscript language reference, complete program examples, the program design guide, the workout record format, the built-in exercise list, and the source of every built-in program.

So you can say "Create a 4-day upper/lower program with linear progression". Or "I did 3x5 squats at 225lb today". Or "How has my squat progressed over the last month?".

Everything that touches your account needs Premium. The reference tools work without an account.

## Connect Claude, ChatGPT or Gemini

The server URL is `https://www.liftosaur.com/mcp`.

- **Claude.ai and Claude Desktop**: go to **Settings → Connectors**, click **Add custom connector**, and paste the URL. A browser window opens to sign in with your Liftosaur account.
- **Claude Code**: run `claude mcp add liftosaur --transport http https://www.liftosaur.com/mcp`.
- **ChatGPT**: open **Plugins**, search for **Liftosaur**, select **Connect**, and sign in. In a chat, mention **@Liftosaur**.
- **Gemini CLI**: add the server to `~/.gemini/settings.json` with `"httpUrl": "https://www.liftosaur.com/mcp"`, then run `/mcp auth liftosaur`.

Sign-in uses OAuth 2.1. The client opens a browser window once, and then refreshes the token on its own. Every client's exact steps are in the [MCP server docs](/doc/mcp).

## Connect with an API key

![Me → API Keys](/images/features/ai-and-mcp/ai-and-mcp-api-keys.webp) ![A new key, with Copy and Delete](/images/features/ai-and-mcp/ai-and-mcp-api-key-created.webp)

Command-line clients and config-file setups can skip the browser sign-in and use an API key instead.

1. Go to **Me → API Keys**.
2. Type a name and tap **Create**.
3. Tap **Copy**. The key starts with `lftsk_`.

Send it as a header: `Authorization: Bearer lftsk_your_key_here`. Keep the key secret. If you lose it, tap **Delete** and create a new one. The same key works for the [REST API](/docs/api).

## Write a program with an assistant

Ask for the program you want. The assistant reads the Liftoscript reference, writes the program, tests it with `run_playground`, and saves it to your account with `create_program`. If it skips the reference and the syntax comes out wrong, tell it to call `get_liftoscript_reference` first.

To change a program, describe the change: "My program doesn't have enough back work." The assistant reads your current program with `get_program`, edits the Liftoscript, and saves it with `update_program`.

To check balance, ask for `get_program_stats`. It returns volume per muscle group and session length.

Your phone gets the change in real time. There is no need to close and reopen the app.

## Without Premium

The reference tools are open to everyone. An assistant can read the Liftoscript reference, the examples, the design guide and the built-in programs, and write valid Liftoscript for you. Paste the result into the [Web Editor](/planner), or into the program editor in the app. See [Liftoscript](/doc/liftoscript) for the syntax.

## Autofill muscles for a custom exercise

When you create a custom exercise, the form has an **Autofill Muscles and Types** button. Type the exercise name and tap the button. The app asks an AI model to fill the target muscles, synergist muscles and exercise types from the name. Check the result and adjust anything that looks wrong. If the name is unknown, the app says "Couldn't autofill the muscles for this exercise. Try a different name!".

## The old prompt generator

The page at `liftosaur.com/ai/prompt` used to build a large prompt with the docs and examples. You copied it into ChatGPT, Claude or Gemini, and pasted the answer back into the web editor. That page is retired. The MCP server replaces the round trip, and the free reference tools cover the same ground without an account.
