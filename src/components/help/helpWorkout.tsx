import { h, JSX, Fragment } from "preact";
import { IconCog2 } from "../icons/iconCog2";

export function HelpWorkout(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Workout Screen</h2>
      <p className="pb-2">This is where all your exercises for the current workout are.</p>
      <p className="pb-2">
        You have to finish all the exercises' sets and reps. Each time you finish a set, you tap on a square to record
        it. By tapping on it again you can lower the number of reps you did.
      </p>
      <p className="pb-2">
        Some reps have <strong>+</strong> in it (like <strong>5+</strong>). That is <strong>AMRAP</strong> - As Many
        Reps As Possible. You should strive to do as many reps as you can there, but if you do less than the number on
        the square, it's considered as an unsuccessful set.
      </p>
      <p className="pb-2">
        In the <strong>Plates for each bar side</strong> section, you can see all the weights you use for that exercise,
        and the plates you have to put on each side of the bar to get that weight. E.g. <strong>185lb - 45/25</strong>{" "}
        means that to get <strong>185lb</strong> you need to put one <strong>45lb</strong> and one <strong>25lb</strong>{" "}
        plate on each side of the bar. By tapping on the weights there you can change them for that workout. It won't
        change the weight in the program though, only for that workout.
      </p>
      <p className="pb-2">
        Note that it <strong>only will use the available plates</strong> in the plates calculator, and it will round up
        the weights to available plates. Set up what plates you have in the <strong>Settings</strong> screen (bottom
        right corner, the <IconCog2 /> icon).
      </p>
      <p className="pb-2">
        The order of doing exercises and sets is not important, the app doesn't inforce it at all. You can do
        "supersets", i.e. simultaneously going through e.g. 2 exercises one after another, without rest period, to save
        time in gym.
      </p>
      <p>
        After you've done all the sets for an exercise, the "Finish Day Script" for that exercise will be run. It may
        increase or decrease weight or reps, depending on the logic defined in the program for that exercise. If
        there're any changes applied, you'll see that under the exercise, in the{" "}
        <strong>Exercise State Variables changes</strong> block.
      </p>
    </>
  );
}
