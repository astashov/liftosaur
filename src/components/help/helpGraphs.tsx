import { h, JSX, Fragment } from "preact";
import { IconFilter } from "../icons/iconFilter";
import { Link } from "../link";

export function HelpGraphs(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Graphs</h2>
      <p className="pb-2">
        Here you can see <strong>graphs of your exercises and measurements</strong> (like bodyweight, bicep size, etc).
      </p>
      <p className="pb-2">
        You can configure the list of graphs by tapping on the <IconFilter /> icon in the navbar. There, you can also
        enable the following options there:
      </p>
      <ul className="pb-2 list-disc">
        <li className="pb-1 ml-6">
          You can enable <strong>same range on X axis for all graphs</strong>. By default they start from the first date
          of the exercise/measurement, and finish at the last one. But if you want to see correlation between graphs,
          it's convenient to use the same scale, so there's an option for that.
        </li>
        <li className="pb-1 ml-6">
          You can add <strong>bodyweight overlay</strong> to the graphs, to see how your lifts were affected by your
          weight.
        </li>
        <li className="pb-1 ml-6">
          And you can add <strong>1RM overlay</strong> (One Rep Max - the max weight you can lift for one rep) to the
          graphs. It tries to predict what would be your 1RM based on how much weight and how many reps you did, using{" "}
          <Link href="https://en.wikipedia.org/wiki/One-repetition_maximum">Epley formula</Link>. It's a good way to
          track progress in your lifts, when you have different reps and weights in sets.
        </li>
      </ul>
      <p className="pb-2">If you move your finger over graphs, you could see the date and the value at that point.</p>
    </>
  );
}
