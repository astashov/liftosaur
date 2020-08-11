import { h, JSX, Fragment } from "preact";
import { ExcerciseSetView } from "./excerciseSet";
import { Excercise, IExcerciseType } from "../models/excercise";
import { IDispatch } from "../ducks/types";
import { IProgressMode } from "../models/progress";
import { Weight, IWeight } from "../models/weight";
import { Reps } from "../models/set";
import { IHistoryEntry } from "../models/history";
import { CollectionUtils } from "../utils/collection";
import { ISettings } from "../models/settings";

interface IProps {
  entry: IHistoryEntry;
  settings: ISettings;
  dispatch: IDispatch;
  onChangeReps: (mode: IProgressMode) => void;
}

export function ExcerciseView(props: IProps): JSX.Element {
  const { entry } = props;
  if (Reps.isFinished(entry.sets)) {
    if (Reps.isCompleted(entry.sets)) {
      return (
        <section className="px-4 pt-4 pb-2 mb-2 bg-green-100 border border-green-300 rounded-lg">
          <ExcerciseContentView {...props} />
        </section>
      );
    } else {
      return (
        <section className="px-4 pt-4 pb-2 mb-2 bg-red-100 border border-red-300 rounded-lg">
          <ExcerciseContentView {...props} />
        </section>
      );
    }
  } else {
    return (
      <section className="px-4 pt-4 pb-2 mb-2 bg-gray-100 border border-gray-300 rounded-lg">
        <ExcerciseContentView {...props} />
      </section>
    );
  }
}

function ExcerciseContentView(props: IProps): JSX.Element {
  const excercise = Excercise.get(props.entry.excercise);
  const nextSet = [...props.entry.warmupSets, ...props.entry.sets].filter((s) => s.completedReps == null)[0];
  const workoutWeights = CollectionUtils.compatBy(
    props.entry.sets.map((s) => Weight.roundConvertTo(s.weight, props.settings, props.entry.excercise.bar)),
    (w) => w.value.toString()
  );
  workoutWeights.sort(Weight.compare);
  const warmupSets = props.entry.warmupSets;
  const warmupWeights = CollectionUtils.compatBy(
    props.entry.warmupSets.map((s) => Weight.roundConvertTo(s.weight, props.settings, props.entry.excercise.bar)),
    (w) => w.value.toString()
  ).filter((w) => Object.keys(Weight.calculatePlates(w, props.settings, props.entry.excercise.bar).plates).length > 0);
  warmupWeights.sort(Weight.compare);
  return (
    <Fragment>
      <header className="flex">
        <div className="flex-1 mr-auto">{excercise.name}</div>
        <div className="text-right">
          {warmupWeights.map((w) => {
            const className =
              nextSet != null &&
              Weight.eq(Weight.roundConvertTo(nextSet.weight, props.settings, props.entry.excercise.bar), w)
                ? "font-bold"
                : "";
            return (
              <div className={className}>
                <WeightView weight={w} excercise={props.entry.excercise} settings={props.settings} />
                <span className="text-gray-500">
                  {w.value} {w.unit}
                </span>
              </div>
            );
          })}
          {workoutWeights.map((w) => {
            const className =
              nextSet != null &&
              Weight.eq(Weight.roundConvertTo(nextSet.weight, props.settings, props.entry.excercise.bar), w)
                ? "font-bold"
                : "";
            return (
              <div className={className}>
                <WeightView weight={w} excercise={props.entry.excercise} settings={props.settings} />
                <button
                  className="text-blue-500 underline cursor-pointer"
                  style={{ fontWeight: "inherit" }}
                  onClick={() =>
                    props.dispatch({ type: "ChangeWeightAction", weight: w, excercise: props.entry.excercise })
                  }
                >
                  {w.value} {w.unit}
                </button>
              </div>
            );
          })}
        </div>
      </header>
      <section className="flex flex-wrap pt-2">
        {warmupSets?.length > 0 && (
          <Fragment>
            {warmupSets.map((set, i) => {
              return (
                <div>
                  <div className="text-xs text-gray-400" style={{ marginTop: "-0.75em", marginBottom: "-0.75em" }}>
                    Warmup
                  </div>
                  <ExcerciseSetView
                    settings={props.settings}
                    excercise={props.entry.excercise}
                    set={set}
                    onClick={(event) => {
                      event.preventDefault();
                      props.onChangeReps("warmup");
                      handleClick(props.dispatch, props.entry.excercise, set.weight, i, "warmup");
                    }}
                  />
                </div>
              );
            })}
            <div style={{ width: "1px" }} className="h-12 my-2 mr-3 bg-gray-400"></div>
          </Fragment>
        )}
        {props.entry.sets.map((set, i) => {
          return (
            <ExcerciseSetView
              excercise={props.entry.excercise}
              settings={props.settings}
              set={set}
              onClick={(event) => {
                event.preventDefault();
                props.onChangeReps("workout");
                handleClick(props.dispatch, props.entry.excercise, set.weight, i, "workout");
              }}
            />
          );
        })}
      </section>
    </Fragment>
  );
}

function handleClick(
  dispatch: IDispatch,
  excercise: IExcerciseType,
  weight: IWeight,
  setIndex: number,
  mode: IProgressMode
): void {
  dispatch({ type: "ChangeRepsAction", excercise, setIndex, weight, mode });
}

function WeightView(props: { weight: IWeight; excercise: IExcerciseType; settings: ISettings }): JSX.Element {
  const { plates, totalWeight: weight } = Weight.calculatePlates(props.weight, props.settings, props.excercise.bar);
  const className = Weight.eq(weight, props.weight) ? "text-gray-600" : "text-red-600";
  return (
    <span className="mx-2 text-xs break-all">
      <span className={className}>{Weight.formatOneSide(plates, props.excercise.bar)}</span>
    </span>
  );
}
