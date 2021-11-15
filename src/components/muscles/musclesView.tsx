import { h, JSX, Fragment } from "preact";
import { useState } from "preact/hooks";
import { Exercise } from "../../models/exercise";
import { IPoints, IScreenMuscle, Muscle } from "../../models/muscle";
import { ISettings } from "../../types";
import { CollectionUtils } from "../../utils/collection";
import { ObjectUtils } from "../../utils/object";
import { StringUtils } from "../../utils/string";
import { GroupHeader } from "../groupHeader";
import { BackMusclesSvg, IMuscleStyle } from "./images/backMusclesSvg";
import { FrontMusclesSvg } from "./images/frontMusclesSvg";

export interface IMusclesViewProps {
  title: string;
  headerTitle: string;
  headerHelp: JSX.Element;
  points: IPoints;
  settings: ISettings;
}

export function MusclesView(props: IMusclesViewProps): JSX.Element {
  const [type, setType] = useState<"strength" | "hypertrophy">("strength");

  const muscleData = ObjectUtils.keys(props.points.screenMusclePoints[type]).reduce<
    Partial<Record<IScreenMuscle, IMuscleStyle>>
  >((memo, key) => {
    const value = props.points.screenMusclePoints[type][key];
    memo[key] = { opacity: value, fill: "#9b2c2c" };
    return memo;
  }, {});
  const exercises = ObjectUtils.keys(props.points.exercisePoints[type]).map((k) => Exercise.fromKey(k));
  return (
    <>
      <GroupHeader name={props.headerTitle} help={props.headerHelp} />
      <div className="text-xs text-center">
        <button
          className={`inline-block w-32 px-4 py-1 mt-2  tetext-center border border-gray-600 cursor-pointer ${
            type === "strength" ? "bg-gray-400" : ""
          }`}
          onClick={() => setType("strength")}
          style={{ borderRadius: "10px 0 0 10px" }}
        >
          Strength
        </button>
        <button
          className={`inline-block w-32 px-4 py-1 text-center border border-gray-600 cursor-pointer ${
            type === "hypertrophy" ? "bg-gray-400" : ""
          }`}
          onClick={() => setType("hypertrophy")}
          style={{ marginLeft: "-1px", borderRadius: "0 10px 10px 0" }}
        >
          Hypertrophy
        </button>
      </div>
      <section className="flex p-4">
        <div className="relative flex-1">
          <BackMusclesSvg muscles={muscleData} contour={{ fill: "#e53e3e" }} />
        </div>
        <div className="relative flex-1">
          <FrontMusclesSvg muscles={muscleData} contour={{ fill: "#e53e3e" }} />
        </div>
      </section>
      <section className="p-4">
        <div className="flex text-xs">
          <div className="flex-1 px-4">
            <div className="font-bold">Muscles used, relatively to each other</div>
            {CollectionUtils.sort(
              ObjectUtils.keys(muscleData),
              (a, b) => (muscleData[b]?.opacity || 0) - (muscleData[a]?.opacity || 0)
            ).map((muscleName) => {
              const value = muscleName ? (muscleData[muscleName]?.opacity ?? 0) * 100 : undefined;
              let color = "text-gray-600";
              if (value != null && value > 60) {
                color = "text-green-600";
              } else if (value != null && value < 20) {
                color = "text-red-600";
              }
              return (
                <div className="flex flex-1">
                  {muscleName && <div className="flex-1">{StringUtils.capitalize(muscleName)}</div>}
                  {value != null ? <div className={color}>{value.toFixed(0)}%</div> : undefined}
                </div>
              );
            })}
          </div>
          <div className="flex-1 px-4">
            <div className="font-bold">List Of Exercises ({type})</div>
            {exercises
              .filter((e) => props.points.exercisePoints[type][Exercise.toKey(e)] != null)
              .map((e) => {
                const targetScreenMuscles = Array.from(
                  new Set(
                    CollectionUtils.flat(
                      Exercise.targetMuscles(e, props.settings.exercises).map((t) =>
                        Muscle.getScreenMusclesFromMuscle(t)
                      )
                    )
                  )
                );
                const synergistScreenMuscles = Array.from(
                  new Set(
                    CollectionUtils.flat(
                      Exercise.synergistMuscles(e, props.settings.exercises).map((t) =>
                        Muscle.getScreenMusclesFromMuscle(t)
                      )
                    )
                  )
                );
                const targetScreenMusclesWithPercentage: [string, number][] = targetScreenMuscles.map((m) => [
                  StringUtils.capitalize(m),
                  (props.points.exercisePoints[type][Exercise.toKey(e)]?.[m] || 0) * 100,
                ]);
                targetScreenMusclesWithPercentage.sort((a, b) => b[1] - a[1]);
                const synergistScreenMusclesWithPercentage: [string, number][] = synergistScreenMuscles.map((m) => [
                  StringUtils.capitalize(m),
                  (props.points.exercisePoints[type][Exercise.toKey(e)]?.[m] || 0) * 100,
                ]);
                synergistScreenMusclesWithPercentage.sort((a, b) => b[1] - a[1]);
                return (
                  <div>
                    <div className="text-green-700">{Exercise.get(e, props.settings.exercises).name}</div>
                    <div data-cy="target-muscles-list" className="pl-2">
                      <div className="text-gray-600">Target: </div>
                      {targetScreenMusclesWithPercentage.map(([m, val]) => (
                        <div className="pl-2">
                          <span>{m}</span>: <span>{val.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                    <div data-cy="synergist-muscles-list" className="pl-2">
                      <span className="text-gray-600">Synergist: </span>
                      {synergistScreenMusclesWithPercentage.map(([m, val]) => (
                        <div className="pl-2">
                          <span>{m}</span>: <span>{val.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </section>
    </>
  );
}
