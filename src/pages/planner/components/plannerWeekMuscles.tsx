/* eslint-disable @typescript-eslint/ban-types */
import { h, JSX } from "preact";
import { ObjectUtils } from "../../../utils/object";
import { IScreenMuscle } from "../../../models/muscle";
import { BackMusclesSvg, IMuscleStyle } from "../../../components/muscles/images/backMusclesSvg";
import { FrontMusclesSvg } from "../../../components/muscles/images/frontMusclesSvg";
import { IMuscleGroupSetSplit, IPlannerSettings } from "../models/types";

interface IPlannerMusclesProps {
  settings: IPlannerSettings;
  data: IMuscleGroupSetSplit;
}

export function PlannerWeekMuscles(props: IPlannerMusclesProps): JSX.Element {
  const muscleData = ObjectUtils.keys(props.data).reduce<Partial<Record<IScreenMuscle, IMuscleStyle>>>((memo, key) => {
    const setNumber = props.data[key].strength + props.data[key].hypertrophy;
    const [, max] = props.settings.weeklyRangeSets[key];
    const value = setNumber / max;
    memo[key] = { opacity: value, fill: "#28839F" };
    return memo;
  }, {});

  return (
    <section className="planner-muscles">
      <section className="flex">
        <div className="relative flex-1">
          <BackMusclesSvg defaultOpacity={0} muscles={muscleData} contour={{ fill: "#28839F" }} />
        </div>
        <div className="relative flex-1">
          <FrontMusclesSvg defaultOpacity={0} muscles={muscleData} contour={{ fill: "#28839F" }} />
        </div>
      </section>
    </section>
  );
}
