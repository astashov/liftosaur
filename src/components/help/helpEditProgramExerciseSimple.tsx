import { JSX, h, Fragment } from "preact";

export function HelpEditProgramExerciseSimple(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Edit Program Exercise - Simple</h2>
      <p className="pb-2">
        This is the <strong>simple</strong> mode of editing a program exercise. It's convenient for relatively simple
        sets/reps/weight schemes, when there's same number of reps and same weight for each set.
      </p>
      <p className="pb-2">
        First you need to <strong>pick an exercise</strong>. You can pick from a list of exercises (we have like 150 of
        them). You can also create a custom one, by choosing a name, an equipment for it, and also optionally - a list
        of <i>target</i> and <i>synergist</i> muscles. The muscles would be used for the muscle balance map of the day
        and the program.
      </p>
      <p className="pb-2">
        There's also <strong>Substitute exercise</strong> feature, where you can choose another exercise targeting the
        same or similar muscles, just different type, or with different equipment.
      </p>
      <p className="pb-2">You can specify a simple logic for increasing and decreasing weights:</p>
      <ul className="pb-2 list-disc">
        <li className="pb-1 ml-6">
          <strong>increasing</strong> weight by <strong>kg/lb</strong> or <strong>percent</strong> of current weight
          after <strong>1 or more successful</strong> attempts.
        </li>
        <li className="pb-1 ml-6">
          <strong>decreasing</strong> weight by <strong>kg/lb</strong> or <strong>percent</strong> of current weight
          after <strong>1 or more unsuccessful</strong> attempts.
        </li>
      </ul>
      <p className="pb-2">
        In case you need more complex logic, you can switch to <strong>Advanced</strong> mode, where you can specify any
        sets/reps/weights scheme, and define any logic for changing weights, reps and sets after completing exercise.
      </p>
      <p className="pb-2">
        <strong>Advanced</strong> mode is not fully backwards compatible with <strong>Simple</strong> mode. If you made
        some changes in <strong>Advanced</strong> mode, because of some of them you can't switch back to{" "}
        <strong>Simple</strong> mode. Here are the exercise requirements to be eligible for the <strong>Simple</strong>{" "}
        mode
      </p>
      <ul className="pb-2 list-disc">
        <li className="pb-1 ml-6">
          Must have <strong>weight</strong> state variable.
        </li>
        <li className="pb-1 ml-6">Should only have one set variation.</li>
        <li className="pb-1 ml-6">
          All sets should have the <strong>weight = state.weight</strong>
        </li>
        <li className="pb-1 ml-6">All sets should have the same weight expression</li>
      </ul>
    </>
  );
}
