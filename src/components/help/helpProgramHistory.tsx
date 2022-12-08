import { h, JSX, Fragment } from "preact";
import { IconCog2 } from "../icons/iconCog2";

export function HelpProgramHistory(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Workout History</h2>
      <p className="pb-2">
        This the main screen. It lists the <strong>next workout</strong> of the selected program, as well as the{" "}
        <strong>history of your workouts</strong>, and <strong>workouts of your friends</strong>.
      </p>
      <p className="pb-2">
        Each history item shows the date, program, day, exercises, reps and <strong>max weight</strong> for that
        exercise. Red reps are unsuccessful ones, i.e. completed reps were less than required reps. Green reps mean they
        were successful. There's also duration of a workout (hours and minutes), likes and comments (if logged in and
        has friends).
      </p>
      <p className="pb-2">
        In order to see friends workouts, you need to create an account, and then add friends. You can do that on the
        settings screen (the <IconCog2 /> icon in the right bottom corner).
      </p>
    </>
  );
}
