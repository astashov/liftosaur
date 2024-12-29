import React, { JSX } from "react";
import { IconFilter } from "../icons/iconFilter";

export function HelpExerciseStats(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Exercise Stats</h2>
      <p className="pb-2">
        All the information about specific exercise is collected on this screen. Progress graph, your personal records,
        and history of the exercise.
      </p>
      <p className="pb-2">You can switch between exercises via a selector at the top of the screen.</p>
      <p className="pb-2">
        If you tap on the personal records or on history records, you'll navigate to the workout where that happened.
      </p>
      <p className="pb-2">
        You can sort/filter the history, by tapping on the <IconFilter /> at the history header, e.g. sort by date
        ascending or descending.
      </p>
    </>
  );
}
