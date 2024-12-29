import React, { JSX } from "react";
import { IconCog2 } from "../icons/iconCog2";

export function HelpEditProgramDaysList(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Edit Program</h2>
      <p className="pb-2">
        A <strong>program</strong> consists of <strong>days</strong>, a <strong>day</strong> consists of{" "}
        <strong>exercises</strong>. Each exercise contains the sets, reps and logic for increasing/decreasing reps and
        weights.
      </p>
      <p className="pb-2">
        At the top, below the program name, you <strong>choose a day</strong> for the next workout. You usually don't
        need to change it, it increments automatically after each workout, but you can force change it to another day if
        you want to skip or return to previous days for some reason.
      </p>
      <p className="pb-2">
        Then, there's a list of days and a list of exercises. You can create those exercises and add them to days. You
        can copy days and exercises, sometimes it helps to speed up program creation/editing process.
      </p>
      <p className="pb-2">You can reorder days, by dragging them by that 6-dot handle icon</p>
      <p className="pb-2">
        Each exercise tracks its own state, like what's its current weight, or reps, or anything like that. You can
        reuse the same exercise between days, and it will update the state can copy days and exercises, sometimes it
        helps to speed up program creation/editing process.
      </p>
      <p className="pb-2">
        You can also export the currently editing program to a file, in case you want to edit it in your text editor
        (it's a JSON file), or you want to share with somebody. You can later on import it on the Setting screen (the{" "}
        <IconCog2 /> icon in the right bottom corner).
      </p>
    </>
  );
}
