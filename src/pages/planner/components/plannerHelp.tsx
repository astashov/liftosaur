import { JSX } from "react";
import { PlannerCodeBlock } from "./plannerCodeBlock";
import { IconCloseCircleOutline } from "../../../components/icons/iconCloseCircleOutline";

const exampleScript = "Squat / 3x3-5\nRomanian Deadlift / 3x8";

export function PlannerHelp(props: { onClose: () => void }): JSX.Element {
  return (
    <div className="relative px-8 py-4 mb-4 border rounded-lg border-border-cardyellow bg-background-cardyellow">
      <p className="mb-2">
        This tool allows you to quickly build your weightlifting programs, ensure you have proper{" "}
        <strong>weekly volume per muscle group</strong>, and balance it with the <strong>time you spend in a gym</strong>.
        You can build multi-week programs, plan your mesocycles, deload weeks, testing 1RM weeks, and see the weekly
        undulation of volume and intensity of each exercise on a graph.
      </p>
      <p className="mb-2">
        Set the program name, create weeks and days, type the list of exercises for each day, putting each exercise on a
        new line, along with the number of sets and reps after slash (<code>/</code>) character, like this:
      </p>
      <div>
        <div className="inline-block px-4 py-2 my-1 mb-2 border rounded-md bg-background-default border-border-neutral">
          <PlannerCodeBlock script={exampleScript} />
        </div>
      </div>
      <p className="mb-2">
        Autocomplete will help you with the exercise names. You can also create custom exercises if they're missing in
        the library.
      </p>
      <p className="mb-2">
        On the right you'll see <strong>Stats</strong>: the number of sets per week, day or exercise per muscle group,
        whether you're in the recommended range (indicated by color), strength/hypertrophy split, and if you hover a
        mouse over the numbers - you'll see what exercises contribute to that number, and how much.
      </p>
      <p className="mb-2">
        Use <strong>Reorder</strong> to move, duplicate or swap weeks, days and exercises, and{" "}
        <strong>Full Program</strong> to edit the whole program as one text.
      </p>
      <p className="mb-2">
        The exercise syntax supports{" "}
        <abbr title="RPE - Rate of Perceived Exertion. It's a subjective measure of how hard the set was.">RPEs</abbr>,
        percentage of <abbr title="1RM - One Rep Max. The maximum weight you can lift for one repetition.">1RM</abbr>,
        rest timers, various progressive overload types, etc. Read more about the features{" "}
        <a target="_blank" className="font-bold underline text-text-link" href="https://www.liftosaur.com/doc/">
          in the docs
        </a>
        !
      </p>
      <p className="mb-2">
        When you're done, you can convert this program to Liftosaur program, and run what you planned in the gym, using
        the <strong>Liftosaur app</strong>!
      </p>
      <button
        className="absolute nm-planner-help-close"
        style={{ top: "0.5rem", right: "0.5rem" }}
        aria-label="Close help"
        onClick={props.onClose}
      >
        <IconCloseCircleOutline />
      </button>
    </div>
  );
}
