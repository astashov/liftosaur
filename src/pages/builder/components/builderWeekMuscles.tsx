/* eslint-disable @typescript-eslint/ban-types */
import { h, JSX } from "preact";
import { IBuilderWeek } from "../models/types";
import { IBuilderDispatch, IBuilderState } from "../models/builderReducer";
import { ObjectUtils } from "../../../utils/object";
import { IScreenMuscle } from "../../../models/muscle";
import { BackMusclesSvg, IMuscleStyle } from "../../../components/muscles/images/backMusclesSvg";
import { FrontMusclesSvg } from "../../../components/muscles/images/frontMusclesSvg";
import { CollectionUtils } from "../../../utils/collection";
import { MenuItem } from "../../../components/menuItem";
import { StringUtils } from "../../../utils/string";
import { BuilderWeekModel } from "../models/builderWeekModel";
import { lb } from "lens-shmens";

interface IBuilderWeekMusclesProps {
  week: IBuilderWeek;
  weekIndex: number;
  dispatch: IBuilderDispatch;
}

export function BuilderWeekMuscles(props: IBuilderWeekMusclesProps): JSX.Element {
  const points = BuilderWeekModel.getScreenMusclePointsForWeek(props.week);
  const muscleData = ObjectUtils.keys(points).reduce<Partial<Record<IScreenMuscle, IMuscleStyle>>>((memo, key) => {
    const value = points[key];
    memo[key] = { opacity: value, fill: "#28839F" };
    return memo;
  }, {});
  const leftColumn: IScreenMuscle[] = ["back", "glutes", "hamstrings", "calves", "triceps"];
  const rightColumn: IScreenMuscle[] = ["shoulders", "abs", "quadriceps", "chest", "biceps", "forearms"];

  return (
    <section className="sticky top-0 builder-week-muscles">
      <h3 className="pt-2 font-bold">{props.week.name} volume per muscle group</h3>
      <section className="flex p-4">
        <div className="relative flex-1">
          <BackMusclesSvg defaultOpacity={0} muscles={muscleData} contour={{ fill: "#28839F" }} />
        </div>
        <div className="relative flex-1">
          <FrontMusclesSvg defaultOpacity={0} muscles={muscleData} contour={{ fill: "#28839F" }} />
        </div>
      </section>
      <section className="flex gap-4">
        <div className="flex-1">{getMuscleItems(leftColumn, muscleData, props.weekIndex, props.dispatch)}</div>
        <div className="flex-1">{getMuscleItems(rightColumn, muscleData, props.weekIndex, props.dispatch)}</div>
      </section>
    </section>
  );
}

function getMuscleItems(
  muscles: IScreenMuscle[],
  muscleData: Partial<Record<IScreenMuscle, IMuscleStyle>>,
  weekIndex: number,
  dispatch: IBuilderDispatch
): JSX.Element[] {
  return CollectionUtils.sort(
    ObjectUtils.keys(muscleData).filter((k) => muscles.indexOf(k) !== -1),
    (a, b) => (muscleData[b]?.opacity || 0) - (muscleData[a]?.opacity || 0)
  )
    .filter((m) => m)
    .map((muscleName) => {
      const value = muscleName ? (muscleData[muscleName]?.opacity ?? 0) * 100 : undefined;
      let color = "text-grayv2-600";
      if (value != null && value > 60) {
        color = "text-greenv2-600";
      } else if (value != null && value < 20) {
        color = "text-redv2-600";
      }
      return (
        <div className="text-sm cursor-pointer">
          <MenuItem
            name={StringUtils.capitalize(muscleName)}
            onClick={() => {
              dispatch([
                lb<IBuilderState>().p("ui").p("modalExercisesByMuscle").record({
                  muscle: muscleName,
                  weekIndex: weekIndex,
                }),
              ]);
            }}
            value={<div className={color}>{Math.min(100, value || 0).toFixed(0)}%</div>}
          />
        </div>
      );
    });
}
