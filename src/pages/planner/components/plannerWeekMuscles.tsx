import { h, JSX } from "preact";
import { ObjectUtils_keys } from "../../../utils/object";
import { BackMusclesSvg, IMuscleStyle } from "../../../components/muscles/images/backMusclesSvg";
import { FrontMusclesSvg } from "../../../components/muscles/images/frontMusclesSvg";
import { IMuscleGroupSetSplit } from "../models/types";
import { ISettings, IScreenMuscle } from "../../../types";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";

interface IPlannerMusclesProps {
  settings: ISettings;
  data: IMuscleGroupSetSplit;
}

export function PlannerWeekMuscles(props: IPlannerMusclesProps): JSX.Element {
  const muscleData = ObjectUtils_keys(props.data).reduce<Partial<Record<IScreenMuscle, IMuscleStyle>>>((memo, key) => {
    const setNumber = props.data[key].strength + props.data[key].hypertrophy;
    const [, max] = props.settings.planner.weeklyRangeSets[key] ?? [0, 0];
    const value = setNumber / max;
    memo[key] = { opacity: value, fill: Tailwind_semantic().text.link };
    return memo;
  }, {});

  return (
    <section className="planner-muscles">
      <section className="flex">
        <div className="relative flex-1">
          <BackMusclesSvg defaultOpacity={0} muscles={muscleData} contour={{ fill: Tailwind_semantic().text.link }} />
        </div>
        <div className="relative flex-1">
          <FrontMusclesSvg defaultOpacity={0} muscles={muscleData} contour={{ fill: Tailwind_semantic().text.link }} />
        </div>
      </section>
    </section>
  );
}
