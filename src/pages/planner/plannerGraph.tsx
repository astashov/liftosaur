import { JSX, useEffect, useRef } from "react";
import UPlot from "uplot";
import { GraphsPlugins_zoom } from "../../utils/graphsPlugins";

interface IPlannerGraphProps {
  title: string;
  yAxisLabel: string;
  color: string;
  height?: string;
  data: [number[], number[]];
}

export function PlannerGraph(props: IPlannerGraphProps): JSX.Element {
  const graphRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!graphRef.current) {
      return;
    }
    const rect = graphRef.current.getBoundingClientRect();
    const opts: UPlot.Options = {
      class: "planner-exercise-graph",
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
      plugins: [GraphsPlugins_zoom()],
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

    const data = props.data;
    const uplot = new UPlot(opts, data, graphRef.current!);

    const underEl = graphRef.current!.querySelector(".over");
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
    <div className="relative z-0" data-testid="graph" testID="graph">
      <div
        className="w-full"
        data-testid="graph-data"
        testID="graph-data"
        style={{ height: props.height || "10em" }}
        ref={graphRef}
      ></div>
      <div data-testid="graph-legend" testID="graph-legend" className="box-content px-8 text-sm" ref={legendRef}></div>
    </div>
  );
}
