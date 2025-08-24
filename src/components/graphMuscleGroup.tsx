/* eslint-disable @typescript-eslint/no-explicit-any */
import { h, JSX } from "preact";
import UPlot from "uplot";
import { useRef, useEffect, useState } from "preact/hooks";
import { ISettings, IVolumeSelectedType } from "../types";
import { GraphsPlugins } from "../utils/graphsPlugins";
import { StringUtils } from "../utils/string";
import { DateUtils } from "../utils/date";
import { Tailwind } from "../utils/tailwindConfig";

interface IGraphMuscleGroupProps {
  data: [number[], number[], number[]];
  programChangeTimes?: [number, string][];
  muscleGroup: string;
  settings: ISettings;
  initialType?: IVolumeSelectedType;
}

export function GraphMuscleGroup(props: IGraphMuscleGroupProps): JSX.Element {
  const [selectedType, setSelectedType] = useState<IVolumeSelectedType>(props.initialType || "volume");

  return (
    <div className="relative mx-1">
      <div className="absolute z-10 text-xs" style={{ top: "0.25rem", right: "0.75rem" }}>
        <select
          className="p-2 text-right"
          value={selectedType}
          onChange={(e) => setSelectedType(e.currentTarget.value as any)}
        >
          <option selected={selectedType === "volume"} value="volume">
            Volume
          </option>
          <option selected={selectedType === "sets"} value="sets">
            Sets
          </option>
        </select>
      </div>
      <GraphMuscleGroupContent key={selectedType} {...{ ...props, selectedType }} />
    </div>
  );
}

function GraphMuscleGroupContent(props: IGraphMuscleGroupProps & { selectedType: IVolumeSelectedType }): JSX.Element {
  const graphRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const rect = graphRef.current.getBoundingClientRect();
    const data = props.data;
    const dataMaxX = data[0]?.[data[0].length - 1] || new Date(0).getTime() / 1000;
    const dataMinX = Math.max(data[0]?.[0] || 0, dataMaxX - 365 * 24 * 60 * 60);
    const opts: UPlot.Options = {
      title: `${StringUtils.capitalize(props.muscleGroup)} Weekly ${StringUtils.capitalize(props.selectedType)}`,
      class: "graph-muscle-group",
      width: rect.width,
      height: rect.height,
      cursor: {
        y: false,
        lock: true,
      },
      scales: { x: { min: dataMinX, max: dataMaxX } },
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
                const sets = data[2][idx];
                let text = "";
                if (props.selectedType === "volume" && volume != null) {
                  text = `<div class="text-center">${DateUtils.format(date)}, Volume: <strong>${volume} ${
                    props.settings.units
                  }s</strong>`;
                  text += "</div>";
                } else if (props.selectedType === "sets" && sets != null) {
                  text = `<div class="text-center">${DateUtils.format(date)}, Sets: <strong>${sets}</strong>`;
                  text += "</div>";
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
          show: props.selectedType === "volume",
          value: (self, rawValue) => `${rawValue} ${props.settings.units}`,
          stroke: Tailwind.colors().red[500],
          width: 1,
          spanGaps: true,
        },
        {
          label: "Sets",
          show: props.selectedType === "sets",
          value: (self, rawValue) => `${rawValue}`,
          stroke: Tailwind.colors().red[500],
          width: 1,
          spanGaps: true,
        },
      ],
      axes: [
        {},
        {
          show: props.selectedType === "volume",
          values: (self, ticks) => {
            return ticks.map((rawValue) => `${Math.round(rawValue / 1000)}k ${props.settings.units}`);
          },
          stroke: Tailwind.semantic().text.primary,
          ticks: { stroke: Tailwind.semantic().border.neutral },
          grid: { stroke: Tailwind.semantic().border.neutral },
        },
        {
          show: props.selectedType === "sets",
          values: (self, ticks) => {
            return ticks.map((rawValue) => rawValue);
          },
          stroke: Tailwind.semantic().text.primary,
          ticks: { stroke: Tailwind.semantic().border.neutral },
          grid: { stroke: Tailwind.semantic().border.neutral },
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
      <div data-cy="graph-legend" className="box-content px-8 pt-8 pb-2 text-sm" ref={legendRef}></div>
    </div>
  );
}
