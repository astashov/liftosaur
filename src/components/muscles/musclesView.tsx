import { h, JSX } from "preact";
import {
  Exercise_fromKey,
  Exercise_toKey,
  Exercise_targetMuscles,
  Exercise_synergistMuscles,
  Exercise_get,
} from "../../models/exercise";
import { IPoints, Muscle_getScreenMusclesFromMuscle } from "../../models/muscle";
import { IScreenMuscle, ISettings } from "../../types";
import { CollectionUtils_sort, CollectionUtils_flat } from "../../utils/collection";
import { ObjectUtils_keys } from "../../utils/object";
import { StringUtils_capitalize } from "../../utils/string";
import { GroupHeader } from "../groupHeader";
import { Tabs2 } from "../tabs2";
import { BackMusclesSvg, IMuscleStyle } from "./images/backMusclesSvg";
import { FrontMusclesSvg } from "./images/frontMusclesSvg";
import { MenuItem } from "../menuItem";

export interface IMusclesViewProps {
  title: string;
  points: IPoints;
  settings: ISettings;
  hideListOfExercises?: boolean;
}

export function MusclesView(props: IMusclesViewProps): JSX.Element {
  return (
    <Tabs2
      tabs={[
        [
          "Strength",
          <MusclesTypeView
            type="strength"
            points={props.points}
            settings={props.settings}
            hideListOfExercises={props.hideListOfExercises}
          />,
        ],
        [
          "Hypertrophy",
          <MusclesTypeView
            type="hypertrophy"
            points={props.points}
            settings={props.settings}
            hideListOfExercises={props.hideListOfExercises}
          />,
        ],
      ]}
    />
  );
}

interface IMusclesTypeViewProps {
  type: "strength" | "hypertrophy";
  points: IPoints;
  settings: ISettings;
  hideListOfExercises?: boolean;
}

export function MusclesTypeView(props: IMusclesTypeViewProps): JSX.Element {
  const type = props.type;
  const muscleData = ObjectUtils_keys(props.points.screenMusclePoints[type]).reduce<
    Partial<Record<IScreenMuscle, IMuscleStyle>>
  >((memo, key) => {
    const value = props.points.screenMusclePoints[type][key];
    memo[key] = { opacity: value, fill: "#28839F" };
    return memo;
  }, {});
  const exercises = ObjectUtils_keys(props.points.exercisePoints[type]).map((k) => Exercise_fromKey(k));
  return (
    <section>
      <section className="flex p-4">
        <div className="relative flex-1">
          <BackMusclesSvg muscles={muscleData} contour={{ fill: "#28839F" }} />
        </div>
        <div className="relative flex-1">
          <FrontMusclesSvg muscles={muscleData} contour={{ fill: "#28839F" }} />
        </div>
      </section>
      <section className="px-4">
        <GroupHeader name="Muscles used, relatively to each other" />
        {CollectionUtils_sort(
          ObjectUtils_keys(muscleData),
          (a, b) => (muscleData[b]?.opacity || 0) - (muscleData[a]?.opacity || 0)
        )
          .filter((m) => m)
          .map((muscleName) => {
            const value = muscleName ? (muscleData[muscleName]?.opacity ?? 0) * 100 : undefined;
            let color = "text-text-secondary";
            if (value != null && value > 60) {
              color = "text-greenv2-600";
            } else if (value != null && value < 20) {
              color = "text-text-error";
            }
            return (
              <MenuItem
                name={StringUtils_capitalize(muscleName)}
                value={<div className={color}>{(value || 0).toFixed(0)}%</div>}
              />
            );
          })}
        {!props.hideListOfExercises && (
          <div>
            <GroupHeader name={`List Of Exercises (${type})`} topPadding={true} />
            <section className="py-4">
              {exercises
                .filter((e) => props.points.exercisePoints[type][Exercise_toKey(e)] != null)
                .map((e) => {
                  const targetScreenMuscles = Array.from(
                    new Set(
                      CollectionUtils_flat(
                        Exercise_targetMuscles(e, props.settings).map((t) =>
                          Muscle_getScreenMusclesFromMuscle(t, props.settings)
                        )
                      )
                    )
                  );
                  const synergistScreenMuscles = Array.from(
                    new Set(
                      CollectionUtils_flat(
                        Exercise_synergistMuscles(e, props.settings).map((t) =>
                          Muscle_getScreenMusclesFromMuscle(t, props.settings)
                        )
                      )
                    )
                  );
                  const targetScreenMusclesWithPercentage: [string, number][] = targetScreenMuscles.map((m) => [
                    StringUtils_capitalize(m),
                    (props.points.exercisePoints[type][Exercise_toKey(e)]?.[m] || 0) * 100,
                  ]);
                  targetScreenMusclesWithPercentage.sort((a, b) => b[1] - a[1]);
                  const synergistScreenMusclesWithPercentage: [string, number][] = synergistScreenMuscles.map((m) => [
                    StringUtils_capitalize(m),
                    (props.points.exercisePoints[type][Exercise_toKey(e)]?.[m] || 0) * 100,
                  ]);
                  synergistScreenMusclesWithPercentage.sort((a, b) => b[1] - a[1]);
                  return (
                    <div className="pb-2">
                      <div className="text-base font-bold">{Exercise_get(e, props.settings.exercises).name}</div>
                      <div className="flex">
                        <div data-cy="target-muscles-list" className="flex-1">
                          <div className="text-sm text-text-secondary">Target</div>
                          {targetScreenMusclesWithPercentage.map(([m, val]) => (
                            <div>
                              <span>{m}</span>: <span>{val.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                        <div data-cy="synergist-muscles-list" className="flex-1">
                          <span className="text-sm text-text-secondary">Synergist</span>
                          {synergistScreenMusclesWithPercentage.map(([m, val]) => (
                            <div>
                              <span>{m}</span>: <span>{val.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </section>
          </div>
        )}
      </section>
    </section>
  );
}
