/* eslint-disable @typescript-eslint/no-explicit-any */
import { h, JSX } from "preact";
import UPlot from "uplot";
import { useRef, useEffect, useState } from "preact/hooks";
import { CollectionUtils } from "../utils/collection";
import { DateUtils } from "../utils/date";
import { Exercise, equipmentName } from "../models/exercise";
import { Weight } from "../models/weight";
import { IHistoryRecord, IExerciseType, ISettings, IExerciseSelectedType } from "../types";
import { GraphsPlugins } from "../utils/graphsPlugins";
import { IDispatch } from "../ducks/types";
import { HtmlUtils } from "../utils/html";
import { Reps } from "../models/set";
import { ObjectUtils } from "../utils/object";
import { History } from "../models/history";

interface IGraphProps {
  history: IHistoryRecord[];
  isWithOneRm?: boolean;
  isWithProgramLines?: boolean;
  exercise: IExerciseType;
  settings: ISettings;
  title?: string;
  subtitle?: string;
  isSameXAxis?: boolean;
  minX: number;
  maxX: number;
  bodyweightData?: [number, number][];
  initialType?: IExerciseSelectedType;
  dispatch?: IDispatch;
}

function getData(
  history: IHistoryRecord[],
  exerciseType: IExerciseType,
  settings: ISettings,
  isWithOneRm?: boolean,
  bodyweightData?: [number, number][]
): {
  data: [number[], (number | null)[], (number | null)[], (number | null)[], (number | null)[], (number | null)[]];
  historyRecords: { [key: number]: IHistoryRecord };
  changeProgramTimes: [number, string][];
} {
  const changeProgramTimes: [number, string][] = [];
  let currentProgram: string | undefined = undefined;
  const historyRecords: { [key: number]: IHistoryRecord } = {};
  const normalizedData = CollectionUtils.sort(history, (a, b) => a.startTime - b.startTime).reduce<
    [number, number | null, number | null, number | null, number | null, number | null][]
  >((memo, i) => {
    if (!currentProgram || currentProgram !== i.programName) {
      currentProgram = i.programName;
      changeProgramTimes.push([new Date(Date.parse(i.date)).getTime() / 1000, currentProgram]);
    }
    const entry = i.entries.filter((e) => Exercise.eq(e.exercise, exerciseType))[0];
    if (entry != null) {
      const maxSet = History.getMaxWeightSetFromEntry(entry);
      const maxe1RMSet = History.getMax1RMSetFromEntry(entry);
      const volume = Reps.volume(entry.sets);
      if (maxSet != null) {
        const convertedWeight = Weight.convertTo(
          maxSet.completedWeight ?? maxSet.weight ?? Weight.build(0, settings.units),
          settings.units
        );
        let onerm = null;
        if (isWithOneRm) {
          const set = maxe1RMSet || maxSet;
          onerm = Weight.getOneRepMax(
            Weight.convertTo(set.completedWeight ?? set.weight ?? Weight.build(0, settings.units), settings.units),
            set.completedReps || 0,
            set.completedRpe ?? set.rpe ?? 10
          ).value;
        }
        const timestamp = new Date(Date.parse(i.date)).getTime() / 1000;
        historyRecords[timestamp] = i;
        memo.push([
          timestamp,
          Weight.convertTo(convertedWeight, settings.units).value,
          maxSet.completedReps!,
          onerm,
          volume.value,
          null,
        ]);
      }
    }
    return memo;
  }, []);
  const normalizedBodyweightData = (bodyweightData || []).map<
    [number, number | null, number | null, number | null, number | null, number | null]
  >((i) => {
    return [i[0], null, null, null, null, i[1]];
  });
  const sorted = CollectionUtils.sort(
    normalizedData.concat(normalizedBodyweightData),
    (a, b) => (a[0] || 0) - (b[0] || 0)
  );
  const data = sorted.reduce<
    [number[], (number | null)[], (number | null)[], (number | null)[], (number | null)[], (number | null)[]]
  >(
    (memo, i) => {
      memo[0].push(i[0]);
      memo[1].push(i[1]);
      memo[2].push(i[2]);
      memo[3].push(i[3]);
      memo[4].push(i[4]);
      memo[5].push(i[5]);
      return memo;
    },
    [[], [], [], [], [], []]
  );
  return { data, changeProgramTimes, historyRecords };
}

export function GraphExercise(props: IGraphProps): JSX.Element {
  const [selectedType, setSelectedType] = useState<IExerciseSelectedType>(props.initialType || "weight");
  const eqName = equipmentName(props.exercise.equipment);

  return (
    <div className="relative mx-1">
      <div className="absolute z-10 text-xs text-grayv2-main" style={{ top: "2rem", left: "0.75rem" }}>
        {props.subtitle || eqName}
      </div>
      <div className="absolute z-10 text-xs" style={{ top: "0.25rem", right: "0.75rem" }}>
        <select
          className="p-2 text-right"
          value={selectedType}
          onChange={(e) => setSelectedType(e.currentTarget.value as any)}
        >
          <option selected={selectedType === "weight"} value="weight">
            Max Weight
          </option>
          <option selected={selectedType === "volume"} value="volume">
            Volume
          </option>
        </select>
      </div>
      <GraphExerciseContent key={selectedType} {...{ ...props, selectedType }} />
    </div>
  );
}

function GraphExerciseContent(props: IGraphProps & { selectedType: IExerciseSelectedType }): JSX.Element {
  const graphRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const selectedHistoryRecordRef = useRef<IHistoryRecord | undefined>(null);
  const graphGoToHistoryRecordFnName = `graphGoToHistoryRecord${Exercise.toKey(props.exercise)}`;
  const units = props.settings.units;
  useEffect(() => {
    const rect = graphRef.current.getBoundingClientRect();
    const exercise = Exercise.get(props.exercise, props.settings.exercises);
    const result = getData(props.history, props.exercise, props.settings, props.isWithOneRm, props.bodyweightData);
    const data = result.data;
    const dataMaxX = data[0]?.[data[0].length - 1] || new Date(0).getTime() / 1000;
    const dataMinX = Math.max(data[0]?.[0] || 0, dataMaxX - 365 * 24 * 60 * 60);
    const allMaxX = props.maxX;
    const allMinX = Math.max(props.minX, allMaxX - 365 * 24 * 60 * 60);
    const opts: UPlot.Options = {
      title: props.title || `${exercise.name}`,
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
                const volume = data[4][idx];
                const bodyweight = data[5][idx];
                const historyRecord = result.historyRecords[timestamp];
                const dispatch = props.dispatch;
                let text: string;
                if (weight != null && units != null && reps != null) {
                  if (props.selectedType === "weight") {
                    text = `<div><div class="text-center">${DateUtils.format(
                      date
                    )}, <strong>${weight}</strong> ${units}s x <strong>${reps}</strong> reps`;
                    if (props.isWithOneRm && onerm != null) {
                      text += `, e1RM = <strong>${onerm.toFixed(2)}</strong> ${units}s`;
                    }
                    if (historyRecord != null && dispatch) {
                      text += ` <button onclick="window.${graphGoToHistoryRecordFnName}()" class="font-bold underline border-none workout-link text-bluev2 nm-graph-exercise-workout">Workout</button>`;
                    }
                    text += "</span>";
                  } else {
                    text = `<div><div class="text-center">${DateUtils.format(
                      date
                    )}, Volume: <strong>${volume} ${units}s</strong>`;
                    if (historyRecord != null && dispatch) {
                      text += ` <button onclick="window.${graphGoToHistoryRecordFnName}()" class="font-bold underline border-none workout-link text-bluev2 nm-graph-exercise-workout">Workout</button>`;
                    }
                    text += "</span>";
                  }
                } else if (bodyweight != null) {
                  text = `<span>${DateUtils.format(date)}, Bodyweight - <strong>${bodyweight}</strong> ${units}</div>`;
                } else {
                  return;
                }
                text += "</div>";
                const entryNotes = (historyRecord?.entries || [])
                  .filter((e) => Exercise.eq(props.exercise, e.exercise))
                  .map((e) => e.notes)
                  .filter((e) => e);
                if (historyRecord?.notes || entryNotes.length > 0) {
                  text += "<div class='text-sm text-grayv2-main'>";
                  if (entryNotes.length > 0) {
                    text += `<ul>${entryNotes.map((e) => `<li>${HtmlUtils.escapeHtml(e || "")}</li>`)}</ul>`;
                  }
                  if (historyRecord?.notes) {
                    text += `<div><span class='font-bold'>Workout: </span><span>${HtmlUtils.escapeHtml(
                      historyRecord.notes || ""
                    )}</span></div>`;
                  }
                  text += "</div>";
                }

                const entries = (historyRecord?.entries || []).filter((e) => e.exercise.id === props.exercise.id);
                const stateVars = [];
                for (const entry of entries) {
                  for (const key of ObjectUtils.keys(entry.state || {})) {
                    const value = entry.state?.[key];
                    const displayValue = Weight.isOrPct(value) ? Weight.display(value) : value;
                    stateVars.push(`${key}: <strong>${displayValue}</strong>`);
                  }
                  for (const key of ObjectUtils.keys(entry.vars || {})) {
                    const name = { rm1: "1 Rep Max" }[key] || key;
                    const value = entry.vars?.[key];
                    const displayValue = Weight.isOrPct(value) ? Weight.display(value) : value;
                    stateVars.push(`${name}: <strong>${displayValue}</strong>`);
                  }
                }
                const groups = CollectionUtils.inGroupsOf(2, stateVars);
                if (groups.length > 0) {
                  text += `<ul>${groups
                    .map(([a, b]) => {
                      return `<li class="flex flex-row gap-4 text-xs"><div class="flex-1">${a}</div><div class="flex-1">${
                        b ?? ""
                      }</div></li>`;
                    })
                    .join("")}</ul>`;
                }

                text += "</div>";
                if (legendRef.current != null) {
                  legendRef.current.innerHTML = text;
                  selectedHistoryRecordRef.current = historyRecord;
                }
              },
            ],
          },
        },
      ],
      scales: props.isSameXAxis ? { x: { min: allMinX, max: allMaxX } } : { x: { min: dataMinX, max: dataMaxX } },
      legend: {
        show: false,
      },
      series: [
        {},
        {
          label: "Weight",
          show: props.selectedType === "weight",
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
          label: "e1RM",
          show: props.isWithOneRm && props.selectedType === "weight",
          value: (self, rawValue) => `${rawValue} ${units}`,
          stroke: "#28839F",
          width: 1,
          spanGaps: true,
        },
        {
          label: "Volume",
          show: props.selectedType === "volume",
          value: (self, rawValue) => `${rawValue} ${units}`,
          stroke: "#FF8066",
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

    (window as any)[graphGoToHistoryRecordFnName] = (): void => {
      if (props.dispatch && selectedHistoryRecordRef.current != null) {
        props.dispatch({ type: "EditHistoryRecord", historyRecord: selectedHistoryRecordRef.current });
      }
    };
    return () => {
      delete (window as any)[graphGoToHistoryRecordFnName];
    };
  }, []);

  return (
    <div className="relative z-0 pt-2" data-cy="graph">
      <div className="w-full" data-cy="graph-data" style={{ height: "20em" }} ref={graphRef}></div>
      <div data-cy="graph-legend" className="box-content px-8 pt-8 pb-2 text-sm" ref={legendRef}></div>
    </div>
  );
}
