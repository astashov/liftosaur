import { h, JSX } from "preact";
import UPlot from "uplot";
import { useRef, useEffect } from "preact/hooks";
import "uplot/dist/uPlot.min.css";
import { IHistoryRecord } from "../models/history";
import { CollectionUtils } from "../utils/collection";
import { DateUtils } from "../utils/date";
import { IExcerciseType, Excercise } from "../models/excercise";

interface IGraphProps {
  history: IHistoryRecord[];
  excercise: IExcerciseType;
}

export function Graph(props: IGraphProps): JSX.Element {
  const graphRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const data = CollectionUtils.sort(props.history, (a, b) => a.startTime - b.startTime).reduce<
      [number[], number[], number[]]
    >(
      (memo, i) => {
        const entry = i.entries.find((e) => e.excercise === props.excercise);
        if (entry != null) {
          const maxSet = CollectionUtils.sort(entry.sets, (a, b) => {
            return b.weight !== a.weight ? b.weight - a.weight : (b.completedReps || 0) - (a.completedReps || 0);
          }).find((s) => s.completedReps != null && s.completedReps > 0);
          if (maxSet != null) {
            memo[0].push(new Date(Date.parse(i.date)).getTime() / 1000);
            memo[1].push(maxSet.weight);
            memo[2].push(maxSet.completedReps!);
          }
        }
        return memo;
      },
      [[], [], []]
    );
    const rect = graphRef.current.getBoundingClientRect();
    const excercise = Excercise.get(props.excercise);
    const opts: UPlot.Options = {
      title: `${excercise.name} Max Weight`,
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
                legendRef.current.innerHTML = `${DateUtils.format(
                  date
                )}, <strong>${weight}</strong> lbs x <strong>${reps}</strong> reps`;
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
          value: (self, rawValue) => `${rawValue} lbs`,
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
        const touch = event.touches[0];
        uplot.setCursor({ left: touch.clientX - underRect!.left, top: touch.clientY - underRect!.top });
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
    <div className="pt-2">
      <div className="w-full" style={{ height: "20em" }} ref={graphRef}></div>
      <div className="box-content h-6 px-8 pt-8 pb-2 text-sm text-center" ref={legendRef}></div>
    </div>
  );
}
