import { h, JSX, Fragment } from "preact";

export function HelpExercises(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Settings - Exercises</h2>
      <p className="pb-2">
        You specify your available equipment here, and specifically - what plates and what fixed weights you have
        available.
      </p>
    </>
  );
}
