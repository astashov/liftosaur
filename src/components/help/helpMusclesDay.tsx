import { h, JSX, Fragment } from "preact";

export function HelpMusclesDay(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Muscles Map - Day</h2>
      <p className="pb-2">
        Shows how much specific muscles are used in the current day. You may use it to find imbalances in your program.
      </p>
      <p className="pb-2">
        We calculate usage for <strong>strength</strong> and <strong>hypertrophy</strong> separately. For{" "}
        <strong>strength</strong> we consider sets with reps &lt; 8, for <strong>hypertrophy</strong> - sets with reps
        &gt;= 8.
      </p>
      <p className="pb-2">
        In the <strong>Muscles used, relatively to each other</strong> section, for calculating percentages, we assume
        each <strong>target muscle is 3x of each synergist muscle</strong>, we combine all sets and reps, and then
        normalize by the most used muscle - it will be 100%. So all other muscles would be less than 100%.
      </p>
      <p className="pb-2">
        In the <strong>List of exercises</strong> section, you could see the muscles for each exercise, split into
        target and synergist. It also shows the same numbers as above - how much each muscle is used in the day
        relatively to the top muscle.
      </p>
    </>
  );
}
