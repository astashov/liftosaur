import React, { JSX } from "react";

export function HelpProgramHistory(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Workout History</h2>
      <p className="pb-2">
        This the main screen. It lists the <strong>next workout</strong> of the selected program, as well as the{" "}
        <strong>history of your workouts</strong>
      </p>
      <p className="pb-2">
        Each history item shows the date, program, day, exercises, reps and <strong>max weight</strong> for that
        exercise. <span className="text-redv2-main">Red</span> reps are unsuccessful ones, i.e. completed reps were less
        than required reps. <span className="text-greenv2-main">Green</span> reps mean they were successful. There's
        also duration of a workout (hours and minutes)
      </p>
    </>
  );
}
