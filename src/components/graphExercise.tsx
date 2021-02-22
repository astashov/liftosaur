import { h, JSX } from "preact";
import UPlot from "uplot";
import { useRef, useEffect } from "preact/hooks";
import { CollectionUtils } from "../utils/collection";
import { DateUtils } from "../utils/date";
import { Exercise } from "../models/exercise";
import { Weight } from "../models/weight";
import { IHistoryRecord, IExerciseType, ISettings } from "../types";

interface IGraphProps {
  history: IHistoryRecord[];
  exercise: IExerciseType;
  settings: ISettings;
  title?: string;
}

export function GraphExercise(props: IGraphProps): JSX.Element {
  const graphRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const units = props.settings.units;
  useEffect(() => {
    const data = CollectionUtils.sort(props.history, (a, b) => a.startTime - b.startTime).reduce<
      [number[], number[], number[]]
    >(
      (memo, i) => {
        const entry = i.entries.filter((e) => e.exercise.id === props.exercise.id)[0];
        if (entry != null) {
          const maxSet = CollectionUtils.sort(entry.sets, (a, b) => {
            return b.weight !== a.weight
              ? Weight.compare(b.weight, a.weight)
              : (b.completedReps || 0) - (a.completedReps || 0);
          }).find((s) => s.completedReps != null && s.completedReps > 0);
          if (maxSet != null) {
            memo[0].push(new Date(Date.parse(i.date)).getTime() / 1000);
            memo[1].push(Weight.convertTo(maxSet.weight, props.settings.units).value);
            memo[2].push(maxSet.completedReps!);
          }
        }
        return memo;
      },
      [[], [], []]
    );
    const rect = graphRef.current.getBoundingClientRect();
    const exercise = Exercise.get(props.exercise);
    const opts: UPlot.Options = {
      title: props.title || `${exercise.name} Max Weight`,
      class: "graph-max-weight",
      width: rect.width,
      height: rect.height,
      cursor: {
        lock: true,
      },
      plugins: [
        {
          hooks: {
            setCursor: [
              (self: UPlot): void => {
                const idx = self.cursor.idx!;
                const date = new Date(data[0][idx] * 1000);
                const weight = data[1][idx];
                const reps = data[2][idx];
                let text: string;
                if (weight != null && units != null && reps != null) {
                  text = `${DateUtils.format(
                    date
                  )}, <strong>${weight}</strong> ${units}s x <strong>${reps}</strong> reps`;
                } else {
                  text = "";
                }
                if (legendRef.current != null) {
                  legendRef.current.innerHTML = text;
                }
              },
            ],
          },
        },
      ],
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
        },
        {
          show: false,
          label: "Reps",
          stroke: "blue",
          width: 1,
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
    <div className="pt-2" data-cy="graph">
      <div className="w-full" data-cy="graph-data" style={{ height: "20em" }} ref={graphRef}></div>
      <div data-cy="graph-legend" className="box-content h-6 px-8 pt-8 pb-2 text-sm text-center" ref={legendRef}></div>
    </div>
  );
}
