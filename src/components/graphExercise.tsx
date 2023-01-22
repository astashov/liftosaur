import { h, JSX } from "preact";
import UPlot from "uplot";
import { useRef, useEffect } from "preact/hooks";
import { CollectionUtils } from "../utils/collection";
import { DateUtils } from "../utils/date";
import { Exercise, equipmentToBarKey } from "../models/exercise";
import { Weight } from "../models/weight";
import { IHistoryRecord, IExerciseType, ISettings } from "../types";
import { GraphsPlugins } from "../utils/graphsPlugins";
import { IDispatch } from "../ducks/types";

interface IGraphProps {
  history: IHistoryRecord[];
  isWithOneRm?: boolean;
  isWithProgramLines?: boolean;
  exercise: IExerciseType;
  settings: ISettings;
  title?: string;
  isSameXAxis?: boolean;
  minX: number;
  maxX: number;
  bodyweightData?: [number, number][];
  dispatch?: IDispatch;
}

function getData(
  history: IHistoryRecord[],
  exerciseType: IExerciseType,
  settings: ISettings,
  isWithOneRm?: boolean,
  bodyweightData?: [number, number][]
): {
  data: [number[], (number | null)[], (number | null)[], (number | null)[], (number | null)[]];
  historyRecords: { [key: number]: IHistoryRecord };
  changeProgramTimes: [number, string][];
} {
  const changeProgramTimes: [number, string][] = [];
  let currentProgram: string | undefined = undefined;
  const historyRecords: { [key: number]: IHistoryRecord } = {};
  const normalizedData = CollectionUtils.sort(history, (a, b) => a.startTime - b.startTime).reduce<
    [number, number | null, number | null, number | null, number | null][]
  >((memo, i) => {
    if (!currentProgram || currentProgram !== i.programName) {
      currentProgram = i.programName;
      changeProgramTimes.push([new Date(Date.parse(i.date)).getTime() / 1000, currentProgram]);
    }
    const entry = i.entries.filter((e) => e.exercise.id === exerciseType.id)[0];
    if (entry != null) {
      const maxSet = CollectionUtils.sort(entry.sets, (a, b) => {
        return b.weight !== a.weight
          ? Weight.compare(b.weight, a.weight)
          : (b.completedReps || 0) - (a.completedReps || 0);
      }).find((s) => s.completedReps != null && s.completedReps > 0);
      if (maxSet != null) {
        let onerm = null;
        if (isWithOneRm) {
          const bar = equipmentToBarKey(exerciseType.equipment);
          onerm = Weight.getOneRepMax(maxSet.weight, maxSet.completedReps || 0, settings, bar).value;
        }
        const timestamp = new Date(Date.parse(i.date)).getTime() / 1000;
        historyRecords[timestamp] = i;
        memo.push([
          timestamp,
          Weight.convertTo(maxSet.weight, settings.units).value,
          maxSet.completedReps!,
          onerm,
          null,
        ]);
      }
    }
    return memo;
  }, []);
  const normalizedBodyweightData = (bodyweightData || []).map<
    [number, number | null, number | null, number | null, number | null]
  >((i) => {
    return [i[0], null, null, null, i[1]];
  });
  const sorted = CollectionUtils.sort(
    normalizedData.concat(normalizedBodyweightData),
    (a, b) => (a[0] || 0) - (b[0] || 0)
  );
  const data = sorted.reduce<[number[], (number | null)[], (number | null)[], (number | null)[], (number | null)[]]>(
    (memo, i) => {
      memo[0].push(i[0]);
      memo[1].push(i[1]);
      memo[2].push(i[2]);
      memo[3].push(i[3]);
      memo[4].push(i[4]);
      return memo;
    },
    [[], [], [], [], []]
  );
  return { data, changeProgramTimes, historyRecords };
}

export function GraphExercise(props: IGraphProps): JSX.Element {
  const graphRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const units = props.settings.units;
  useEffect(() => {
    const rect = graphRef.current.getBoundingClientRect();
    const exercise = Exercise.get(props.exercise, props.settings.exercises);
    const result = getData(props.history, props.exercise, props.settings, props.isWithOneRm, props.bodyweightData);
    const data = result.data;
    const opts: UPlot.Options = {
      title: props.title || `${exercise.name} Max Weight`,
      class: "graph-max-weight",
      width: rect.width,
      height: rect.height,
      cursor: {
        y: false,
        lock: true,
      },
      plugins: [
        GraphsPlugins.zoom(),
        ...(props.isWithProgramLines ? [GraphsPlugins.programLines(result.changeProgramTimes)] : []),
        {
          hooks: {
            setCursor: [
              (self: UPlot): void => {
                const idx = self.cursor.idx!;
                const timestamp = data[0][idx];
                const date = new Date(timestamp * 1000);
                const weight = data[1][idx];
                const reps = data[2][idx];
                const onerm = data[3][idx];
                const bodyweight = data[4][idx];
                const historyRecord = result.historyRecords[timestamp];
                const dispatch = props.dispatch;
                let text: string;
                if (weight != null && units != null && reps != null) {
                  text = `${DateUtils.format(
                    date
                  )}, <strong>${weight}</strong> ${units}s x <strong>${reps}</strong> reps`;
                  if (props.isWithOneRm && onerm != null) {
                    text += `, 1RM = <strong>${onerm.toFixed(2)}</strong> ${units}s`;
                  }
                  if (historyRecord != null && dispatch) {
                    text += ` <button class="font-bold underline border-none workout-link text-bluev2">Workout</button>`;
                  }
                } else if (bodyweight != null) {
                  text = `${DateUtils.format(date)}, Bodyweight - <strong>${bodyweight}</strong> ${units}`;
                } else {
                  return;
                }
                if (legendRef.current != null) {
                  legendRef.current.innerHTML = text;
                  setTimeout(() => {
                    const button = legendRef.current.querySelector(".workout-link");
                    if (button && dispatch) {
                      console.log("Set click listener", weight, button);
                      button.addEventListener("click", () => {
                        dispatch({ type: "EditHistoryRecord", historyRecord });
                      });
                      button.addEventListener("touchstart", () => {
                        dispatch({ type: "EditHistoryRecord", historyRecord });
                      });
                    }
                  }, 0);
                }
              },
            ],
          },
        },
      ],
      scales: props.isSameXAxis ? { x: { min: props.minX, max: props.maxX } } : undefined,
      legend: {
        show: false,
      },
      series: [
        {},
        {
          label: "Weight",
          value: (self, rawValue) => `${rawValue} ${units}`,
          stroke: "red",
          width: 1,
          spanGaps: true,
        },
        {
          show: false,
          label: "Reps",
          stroke: "blue",
          width: 1,
        },
        {
          label: "1RM",
          show: props.isWithOneRm,
          value: (self, rawValue) => `${rawValue} ${units}`,
          stroke: "orange",
          width: 1,
          spanGaps: true,
        },
        {
          label: "Bodyweight",
          value: (self, rawValue) => `${rawValue} ${units}`,
          stroke: "green",
          width: 1,
          spanGaps: true,
        },
      ],
    };

    const uplot = new UPlot(opts, data, graphRef.current);

    const underEl = graphRef.current.querySelector(".over");
    const underRect = underEl?.getBoundingClientRect();

    function handler(): void {
      function onMove(event: TouchEvent): void {
        const offset = window.pageYOffset;
        const touch = event.touches[0];
        uplot.setCursor({ left: touch.clientX - underRect!.left, top: touch.clientY - underRect!.top + offset });
      }

      function onEnd(): void {
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      }

      window.addEventListener("touchmove", onMove);
      window.addEventListener("touchend", onEnd);
    }

    if (underEl != null) {
      underEl.addEventListener("touchstart", handler);
    }
  }, []);

  return (
    <div className="relative z-0 pt-2" data-cy="graph">
      <div className="w-full" data-cy="graph-data" style={{ height: "20em" }} ref={graphRef}></div>
      <div data-cy="graph-legend" className="box-content h-6 px-8 pt-8 pb-2 text-sm text-center" ref={legendRef}></div>
    </div>
  );
}
