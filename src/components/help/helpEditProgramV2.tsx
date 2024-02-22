import { h, JSX, Fragment } from "preact";
import { PlannerCodeBlock } from "../../pages/planner/components/plannerCodeBlock";
import { IconGraphsE } from "../icons/iconGraphsE";
import { IconMusclesD } from "../icons/iconMusclesD";
import { IconMusclesW } from "../icons/iconMusclesW";
import { InternalLink } from "../../internalLink";

export function HelpEditProgramV2(): JSX.Element {
  const script = "Squat / 3x3-5\nRomanian Deadlift / 3x8";
  const script2 = "Squat / 3x3-5 65%\nRomanian Deadlift / 3x8 150lb";

  return (
    <>
      <h2 className="pb-2 text-xl">Edit Program</h2>
      <p className="mb-2">
        This tool allows you to quickly build your weightlifting programs, ensure you have proper{" "}
        <strong>weekly volume per muscle group</strong>, and balance it with the{" "}
        <strong>time you spend in a gym</strong>. You can build multi-week programs, plan your mesocycles, deload weeks,
        testing 1RM weeks, and see the weekly undulation of volume and intensity of each exercise on a graph.
      </p>
      <p className="mb-2">
        Set the program name, create weeks and days, type the list of exercises for each day, putting each exercise on a
        new line, along with the number of sets and reps after slash (<pre className="inline">/</pre>) character, like
        this:
      </p>
      <div>
        <div className="px-4 py-2 my-1 mb-2 bg-white border rounded-md border-grayv2-300">
          <PlannerCodeBlock script={script} />
        </div>
      </div>
      <p className="mb-2">
        You can specify weight - either in absolute units (<strong>kg</strong> or <strong>lb</strong>) or as a
        percentage of your{" "}
        <abbr title="1RM - One Rep Max. The maximum weight you can lift for one repetition.">1RM</abbr>:
      </p>
      <div>
        <div className="px-4 py-2 my-1 mb-2 bg-white border rounded-md border-grayv2-300">
          <PlannerCodeBlock script={script2} />
        </div>
      </div>
      <p className="mb-2">
        Autocomplete will help you with the exercise names. You can also create custom exercises if they're missing in
        the library.
      </p>
      <p className="mb-2">
        The <IconMusclesW className="inline-block" /> opens <strong>Weekly Stats</strong>, where you can see the number
        of sets per week per muscle group, whether you're in the recommended range (indicated by color),
        strength/hypertrophy split, and if you tap the numbers - you'll see what exercises contribute to that number,
        and how much.
      </p>
      <p className="mb-2">
        Same thing exists for the day - <IconMusclesD className="inline-block" />, and you can also see exercise details
        and undulation graphs by tapping on <IconGraphsE className="inline-block" />.
      </p>

      <p className="mb-2">
        The exercise syntax supports{" "}
        <abbr title="RPE - Rate of Perceived Exertion. It's a subjective measure of how hard the set was.">RPEs</abbr>,{" "}
        rest timers, various progressive overload types, etc. It's very powerful, read more about all the features{" "}
        <InternalLink
          name="help-edit-program-v2-docs"
          className="font-bold underline text-bluev2"
          href="https://www.liftosaur.com/docs"
        >
          in the docs
        </InternalLink>
        !
      </p>
    </>
  );
}
