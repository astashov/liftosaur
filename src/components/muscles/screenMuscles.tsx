import { h, JSX } from "preact";
import { IDispatch } from "../../ducks/types";
import { HeaderView } from "../header";
import { FooterView } from "../footer";
import { IProgram, Program } from "../../models/program";
import { FrontMusclesSvg } from "./images/frontMusclesSvg";
import { BackMusclesSvg, IMuscleStyle } from "./images/backMusclesSvg";
import { Exercise, IMuscle } from "../../models/exercise";
import { ISettings } from "../../models/settings";
import { ObjectUtils } from "../../utils/object";
import { StringUtils } from "../../utils/string";
import { CollectionUtils } from "../../utils/collection";
import { useState } from "preact/hooks";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  program: IProgram;
}

interface IMuscleMap {
  strength: Partial<Record<IMuscle, number>>;
  hypertrophy: Partial<Record<IMuscle, number>>;
}

function mapValues(program: IProgram, settings: ISettings): IMuscleMap {
  const firstDay = program.days[0];
  const nextIndex = program.days
    .slice(1)
    .findIndex(
      (d) =>
        d.exercises === firstDay.exercises &&
        firstDay.exercises.every((e) => d.exercises.map((ex) => ex.id).indexOf(e.id) !== -1)
    );
  const cycle = nextIndex === -1 ? program.days : program.days.slice(nextIndex - 1);
  const muscleMap: IMuscleMap = {
    strength: {},
    hypertrophy: {},
  };
  for (const day of cycle) {
    for (const exerciseId of day.exercises) {
      const programExercise = program.exercises.find((e) => e.id === exerciseId.id)!;
      const exercise = Exercise.get(programExercise.exerciseType);
      const historyEntry = Program.programExerciseToHistoryEntry(programExercise, program.nextDay, settings);
      const muscles = exercise.muscles;
      for (const set of historyEntry.sets) {
        if (set.reps >= 8) {
          for (const muscle of ObjectUtils.keys(muscles)) {
            const value = muscles[muscle] || 0;
            muscleMap.hypertrophy[muscle] = muscleMap.hypertrophy[muscle] || 0;
            muscleMap.hypertrophy[muscle]! += set.reps * (value / 100);
          }
        } else {
          for (const muscle of ObjectUtils.keys(muscles)) {
            const value = muscles[muscle] || 0;
            muscleMap.strength[muscle] = muscleMap.strength[muscle] || 0;
            muscleMap.strength[muscle]! += set.reps * (value / 100);
          }
        }
      }
    }
  }
  console.log(muscleMap);
  return muscleMap;
}

export function ScreenMuscles(props: IProps): JSX.Element {
  const [type, setType] = useState<"strength" | "hypertrophy">("strength");

  const v = mapValues(props.program, props.settings);
  const muscleData = ObjectUtils.keys(v[type]).reduce<Partial<Record<IMuscle, IMuscleStyle>>>((memo, key) => {
    const value = v[type][key];
    memo[key] = { opacity: (value ?? 0) / 500, fill: "#9b2c2c" };
    return memo;
  }, {});
  const exerciseIds = props.program.days.map((d) => d.exercises.map((e) => e.id)).flat();
  const exercises = props.program.exercises.filter((e) => exerciseIds.indexOf(e.id) !== -1);
  return (
    <section className="h-full">
      <HeaderView
        title={props.program.name}
        subtitle="Muscles Map"
        left={<button onClick={() => props.dispatch({ type: "PullScreen" })}>Back</button>}
      />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <div className="px-4 py-2 text-center">
          Muscles used in the program <div className="font-bold">{props.program.name}</div>
        </div>
        <div className="text-xs text-center">
          <button
            className={`inline-block w-32 px-4 py-1 text-center border border-gray-600 cursor-pointer ${
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
              <div className="font-bold">Muscles Used</div>
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
              <div className="font-bold">List Of Exercises</div>
              {exercises.map((e) => (
                <div>{Exercise.get(e.exerciseType).name}</div>
              ))}
            </div>
          </div>
        </section>
      </section>

      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
