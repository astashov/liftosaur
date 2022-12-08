import { h, JSX, Fragment } from "preact";

export function HelpProgramHistory(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Edit Program</h2>
      <p className="pb-2">
        A program consists of days, a day consists of exercises. Each exercise contains the sets, reps and logic for
        increasing/decreasing reps and weights.
      </p>
      <p className="pb-2">
        At the top, below the program name, you <strong>choose a day</strong> for the next workout. YYou usually don't
        need to change it, it increments automatically after each workout, but you can force change it to another day if
        you want to skip or return to previous days for some reason.
      </p>
      <p className="pb-2">
        Then, there's a list of days and a list of exercises. You can create those exercises and add them to days. You
        can copy days and exercises, sometimes it helps to speed up program creation/editing process.
      </p>
      <p className="pb-2">
        Each exercise tracks its own state, like what's its current weight, or reps, or anything like that. You can
        reuse the same exercise between days, and it will update the state can copy days and exercises, sometimes it
        helps to speed up program creation/editing process.
      </p>
    </>
  );
}
