/* eslint-disable @typescript-eslint/no-explicit-any */
import { h, JSX } from "preact";
import UPlot from "uplot";
import { useRef, useEffect } from "preact/hooks";
import { ISettings } from "../types";
import { GraphsPlugins } from "../utils/graphsPlugins";
import { StringUtils } from "../utils/string";
import { DateUtils } from "../utils/date";

interface IGraphMuscleGroupProps {
  data: [number[], number[]];
  programChangeTimes?: [number, string][];
  muscleGroup: string;
  settings: ISettings;
}

export function GraphMuscleGroup(props: IGraphMuscleGroupProps): JSX.Element {
  const graphRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const rect = graphRef.current.getBoundingClientRect();
    const data = props.data;
    const opts: UPlot.Options = {
      title: `${StringUtils.capitalize(props.muscleGroup)} Weekly Volume`,
      class: "graph-muscle-group",
      width: rect.width,
      height: rect.height,
      cursor: {
        y: false,
        lock: true,
      },
      plugins: [
        GraphsPlugins.zoom(),
        ...(props.programChangeTimes ? [GraphsPlugins.programLines(props.programChangeTimes)] : []),
        {
          hooks: {
            setCursor: [
              (self: UPlot): void => {
                const idx = self.cursor.idx!;
                const timestamp = data[0][idx];
                const date = new Date(timestamp * 1000);
                const volume = data[1][idx];
                let text = "";
                if (volume != null) {
                  text = `<div><div class="text-center">${DateUtils.format(date)}, Volume: <strong>${volume} ${
                    props.settings.units
                  }s</strong>`;
                  text += "</div></div>";
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
          label: "Volume",
          value: (self, rawValue) => `${rawValue} ${props.settings.units}`,
          stroke: "#FF8066",
          width: 1,
          spanGaps: true,
        },
      ],
      axes: [
        {},
        {
          values: (self, ticks) => {
            return ticks.map((rawValue) => `${Math.round(rawValue / 1000)}k ${props.settings.units}`);
          },
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
      <div className="w-full mx-2" data-cy="graph-data" style={{ height: "20em" }} ref={graphRef}></div>
      <div data-cy="graph-legend" className="box-content px-8 pt-8 pb-2 text-sm" ref={legendRef}></div>
    </div>
  );
}
