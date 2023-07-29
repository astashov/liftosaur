/* eslint-disable @typescript-eslint/no-explicit-any */
import { h, JSX } from "preact";
import UPlot from "uplot";
import { useRef, useEffect } from "preact/hooks";
import { IHistoryEntry } from "../../../types";
import { GraphsPlugins } from "../../../utils/graphsPlugins";

interface IProgramDetailsExerciseExampleGraphProps {
  title: string;
  yAxisLabel: string;
  color: string;
  weeksData: { label: string; entry: IHistoryEntry }[];
  getValue: (entry: IHistoryEntry) => number;
}

export function ProgramDetailsExerciseExampleGraph(props: IProgramDetailsExerciseExampleGraphProps): JSX.Element {
  const graphRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const rect = graphRef.current.getBoundingClientRect();
    const opts: UPlot.Options = {
      title: props.title,
      class: "graph-program-details-example",
      width: rect.width,
      height: rect.height,
      cursor: {
        y: false,
        lock: true,
      },
      legend: {
        show: true,
      },
      series: [
        {
          label: "Week",
        },
        {
          label: props.yAxisLabel,
          value: (self, rawValue) => rawValue,
          stroke: props.color,
          width: 1,
          spanGaps: true,
        },
      ],
      plugins: [GraphsPlugins.zoom()],
      scales: {
        x: {
          time: false,
        },
      },
      axes: [
        {
          space: 20,
          incrs: [1],
        },
      ],
    };

    const data: [number[], number[]] = [
      props.weeksData.map((_, i) => i + 1),
      props.weeksData.map((weekData) => {
        return props.getValue(weekData.entry);
      }),
    ];

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
      <div className="w-full" data-cy="graph-data" style={{ height: "10em" }} ref={graphRef}></div>
      <div data-cy="graph-legend" className="box-content px-8 pt-8 pb-2 text-sm" ref={legendRef}></div>
    </div>
  );
}
