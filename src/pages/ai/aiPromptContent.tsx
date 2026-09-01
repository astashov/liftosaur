import type { JSX } from "react";

export function AiPromptContent(): JSX.Element {
  return (
    <section className="flex flex-col max-w-2xl px-4 py-6 mx-auto">
      <h1 className="text-2xl font-bold">The Liftoscript Prompt Generator is retired</h1>
      <p className="mt-4 text-text-secondary">
        This page used to generate a big prompt you'd copy into ChatGPT, Claude or Gemini to convert a workout program
        into Liftoscript, then copy the result back into the web editor. There's a much better way to do that now.
      </p>

      <h2 className="mt-8 text-xl font-bold">Use the MCP server instead</h2>
      <p className="mt-4 text-text-secondary">
        The{" "}
        <a className="font-bold underline text-text-link" href="/doc/mcp">
          Liftosaur MCP server
        </a>{" "}
        connects Claude, ChatGPT or Gemini directly to Liftosaur, so there's no copy-pasting - you just ask, and the
        assistant does the work.
      </p>
      <p className="mt-4 text-text-secondary">
        <strong>Free, no account needed.</strong> The reference tools are open to everyone: the Liftoscript language
        reference, complete program examples, the program design guide, the built-in program sources, and the exercise
        list. That's enough for an assistant to write valid Liftoscript for you, which you can then paste into the{" "}
        <a className="font-bold underline text-text-link" href="/planner">
          Web Editor
        </a>{" "}
        yourself - the same thing this page used to help with, only better.
      </p>
      <p className="mt-4 text-text-secondary">
        <strong>Premium.</strong> Anything that touches your account needs an active subscription: creating and editing
        your programs, logging workouts, reading your history, testing progressions in the playground, and managing
        exercises, gyms and measurements.
      </p>

      <h2 className="mt-8 text-xl font-bold">Some history</h2>
      <p className="mt-4 text-text-secondary">
        This generator shipped in June 2025, back when LLMs had no way to reach into an app. Handing you a
        carefully-built prompt to paste elsewhere was the best available option, and it worked well enough for a while.
      </p>
      <p className="mt-4 text-text-secondary">
        The Liftosaur MCP server arrived in March 2026 and made the whole round trip unnecessary. On top of that, the
        generator could fetch arbitrary URLs on Liftosaur's behalf to read your program from a spreadsheet or a webpage
        - convenient, but not something worth keeping around for a feature that has a better replacement.
      </p>

      <p className="mt-8 text-text-secondary">
        See the{" "}
        <a className="font-bold underline text-text-link" href="/doc/mcp">
          MCP server docs
        </a>{" "}
        for setup instructions, or the{" "}
        <a className="font-bold underline text-text-link" href="/doc">
          Liftoscript docs
        </a>{" "}
        if you'd rather write programs by hand.
      </p>
    </section>
  );
}
