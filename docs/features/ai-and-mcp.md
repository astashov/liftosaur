---
id: ai-and-mcp
title: "Using AI with Liftosaur"
shortDescription: "Add Liftosaur to ChatGPT, or connect Claude and Gemini through the MCP server, and ask the assistant to write programs, log workouts and analyze your history."
category: "Start here"
order: 20
datePublished: "2026-09-27"
dateModified: "2026-09-29"
screenshots: [ai-and-mcp-autofill]
headerScreenshots: false
---

## Add Liftosaur to ChatGPT

Liftosaur is in the ChatGPT plugin directory. There is nothing to configure and no URL to paste.

1. Open [Liftosaur in the ChatGPT plugin directory](https://chatgpt.com/plugins/plugin_asdk_app_6a5bb283d24481918813e6efbc3d66ad), or open **Plugins** in ChatGPT and search for **Liftosaur**.
2. Select **Connect**.
3. Sign in with your Liftosaur account and approve access.
4. In a chat, write **@Liftosaur** before your request, or select **+** → **More** and pick Liftosaur.

From then on you talk to it like this:

- "@Liftosaur create a 4-day upper/lower program with linear progression."
- "@Liftosaur I did 3x5 squats at 225 lb today, log it."
- "@Liftosaur how has my bench press progressed over the last month?"
- "@Liftosaur my program does not have enough back work, fix it."

The change lands in the app right away. There is no need to close and reopen it.

Plugin availability depends on your ChatGPT plan, region and workspace settings. If **Connect** is greyed out in a workspace, ask the administrator to enable Liftosaur for your role.

## What the assistant can do

Behind the plugin is the Liftosaur MCP server. MCP (Model Context Protocol) is an open standard that lets an AI assistant call tools in another app. The assistant gets these tools:

- **Programs**: list your programs, read a program's Liftoscript source, create a program, update it, or delete it.
- **Workout history**: list your workouts with date filters, read one workout, log a new workout, edit one, or delete one.
- **Custom exercises**: list, read, create, update and delete your custom exercises.
- **Gyms and equipment**: list your gyms, add one, rename one or make it current, and edit bars, plates and fixed weights.
- **Exercise settings**: read and set your 1RM, weight rounding, equipment and notes per exercise.
- **Measurements**: read your bodyweight, body part and body fat history, add a value, edit one, or delete one.
- **Testing and analysis**: `run_playground` simulates a workout to check that a progression works. `get_program_stats` reports duration per day, weekly volume per muscle group, and the strength vs hypertrophy split.
- **Reference**: the Liftoscript language reference, complete program examples, the program design guide, the workout record format, the built-in exercise list, and the source of every built-in program.

Everything that touches your account needs [Premium](/features/premium). The reference tools work without an account.

## Write a program with an assistant

Ask for the program you want. The assistant reads the Liftoscript reference, writes the program, tests it with `run_playground`, and saves it to your account with `create_program`. If it skips the reference and the syntax comes out wrong, tell it to call `get_liftoscript_reference` first.

To change a program, describe the change. The assistant reads your current program with `get_program`, edits the Liftoscript, and saves it with `update_program`.

To check balance, ask for `get_program_stats`. It returns volume per muscle group and session length.

## Connect Claude, Gemini and other clients

Any MCP client can use the same server. The URL is `https://www.liftosaur.com/mcp`.

- **Claude.ai and Claude Desktop**: go to **Settings → Connectors**, click **Add custom connector**, and paste the URL. A browser window opens to sign in with your Liftosaur account.
- **Claude Code**: run `claude mcp add liftosaur --transport http https://www.liftosaur.com/mcp`.
- **Gemini CLI**: add the server to `~/.gemini/settings.json` with `"httpUrl": "https://www.liftosaur.com/mcp"`, then run `/mcp auth liftosaur`.

Sign-in uses OAuth 2.1. The client opens a browser window once, and then refreshes the token on its own. Command-line clients and config-file setups can skip the browser and send an [API key](/features/api) as `Authorization: Bearer lftsk_your_key_here` instead. Every client's exact steps are in the [MCP server docs](/doc/mcp).

## Without Premium

The reference tools are open to everyone. An assistant can read the Liftoscript reference, the examples, the design guide and the built-in programs, and write valid Liftoscript for you. Paste the result into the [Web Editor](/planner), or into the program editor in the app. See [Liftoscript](/doc/liftoscript) for the syntax.

## Autofill muscles for a custom exercise

![A custom exercise form after Autofill Muscles and Types](/images/features/ai-and-mcp/ai-and-mcp-autofill.webp)

When you create a custom exercise, the form has an **Autofill Muscles and Types** button. Type the exercise name and tap the button. The app asks an AI model to fill the target muscles, synergist muscles and exercise types from the name. Check the result and adjust anything that looks wrong. If the name is unknown, the app says "Couldn't autofill the muscles for this exercise. Try a different name!". See [Custom Exercises](/features/custom-exercises) for the rest of the form.

## The old prompt generator

The page at `liftosaur.com/ai/prompt` used to build a large prompt with the docs and examples. You copied it into ChatGPT, Claude or Gemini, and pasted the answer back into the web editor. That page is retired. The ChatGPT plugin and the MCP server replace the round trip, and the free reference tools cover the same ground without an account.
