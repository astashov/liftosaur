import { h, JSX, Fragment } from "preact";
import { IconCog2 } from "../icons/iconCog2";

export function HelpProgramHistory(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Workout History</h2>
      <p className="pb-2">
        This screen list the <strong>next workout</strong> of the selected program, as well as the{" "}
        <strong>history of your workouts</strong>, and <strong>workouts of your friends</strong>.
      </p>
      <p className="pb-2">
        Each history item shows the date, program, day, exercises, reps and <strong>max weight</strong> for that
        exercise.
      </p>
      <p className="pb-2">
        In order to see friends workouts, you need to create an account, and then add friends. You can do that on the
        settings screen (the <IconCog2 /> icon in the right bottom corner). exercise.
      </p>
    </>
  );
}
