import { h, JSX } from "preact";
import UPlot from "uplot";
import { useRef, useEffect } from "preact/hooks";
import { CollectionUtils } from "../utils/collection";
import { Weight } from "../models/weight";
import {
  ILengthUnit,
  ISettings,
  IStatsKey,
  IStatsLengthValue,
  IStatsPercentageValue,
  IStatsWeightValue,
  IUnit,
} from "../types";
import { Length } from "../models/length";
import { Stats } from "../models/stats";
import { DateUtils } from "../utils/date";
import { GraphsPlugins } from "../utils/graphsPlugins";
import { IPercentageUnit } from "../types";

interface IGraphStatsProps {
  collection: [number, number][];
  units: IUnit | ILengthUnit | IPercentageUnit;
  statsKey: IStatsKey;
  settings: ISettings;
  title?: string | null;
  isSameXAxis?: boolean;
  minX: number;
  maxX: number;
  movingAverageWindowSize?: number;
}

export function getWeightDataForGraph(coll: IStatsWeightValue[], settings: ISettings): [number, number][] {
  const sortedCollection = CollectionUtils.sort(coll, (a, b) => a.timestamp - b.timestamp);
  return sortedCollection.map((i) => {
    return [i.timestamp / 1000, Weight.convertTo(i.value, settings.units).value];
  });
}

export function getLengthDataForGraph(coll: IStatsLengthValue[], settings: ISettings): [number, number][] {
  const sortedCollection = CollectionUtils.sort(coll, (a, b) => a.timestamp - b.timestamp);
  return sortedCollection.map((i) => {
    return [i.timestamp / 1000, Length.convertTo(i.value, settings.lengthUnits).value];
  });
}

export function getPercentageDataForGraph(coll: IStatsPercentageValue[], settings: ISettings): [number, number][] {
  const sortedCollection = CollectionUtils.sort(coll, (a, b) => a.timestamp - b.timestamp);
  return sortedCollection.map((i) => {
    return [i.timestamp / 1000, i.value.value];
  });
}

export function GraphStats(props: IGraphStatsProps): JSX.Element {
  const graphRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const movingAverageWindowSize = props.movingAverageWindowSize;
  useEffect(() => {
    const data = props.collection.reduce<[number[], number[], number[]]>(
      (memo, i, index, array) => {
        memo[0].push(i[0]);
        memo[1].push(i[1]);

        if (movingAverageWindowSize != null) {
          if (index >= movingAverageWindowSize - 1) {
            const sum = memo[1].slice(index - movingAverageWindowSize + 1, index + 1).reduce((a, b) => a + b, 0);
            const movingAvg = sum / movingAverageWindowSize;
            memo[2].push(Math.round(movingAvg * 10) / 10);
          } else {
            memo[2].push(i[1]);
          }
        }

        return memo;
      },
      [[], [], []]
    );
    const rect = graphRef.current.getBoundingClientRect();
    const opts: UPlot.Options = {
      title: props.title === undefined ? `${Stats.name(props.statsKey)}` : props.title || undefined,
      class: "graph-max-weight",
      width: rect.width,
      height: rect.height,
      cursor: {
        y: false,
        lock: true,
      },
      plugins: [
        GraphsPlugins.zoom(),
        {
          hooks: {
            setCursor: [
              (self: UPlot): void => {
                const idx = self.cursor.idx!;
                const date = new Date(data[0][idx] * 1000);
                const value = data[1][idx];
                let text: string;
                if (value != null && props.units != null) {
                  text = `${DateUtils.format(date)}, <strong>${value}</strong> ${props.units}`;
                  if (movingAverageWindowSize != null) {
                    text += ` (Avg. ${data[2][idx]} ${props.units})`;
                  }
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
      scales: props.isSameXAxis ? { x: { min: props.minX, max: props.maxX } } : undefined,
      series: [
        {},
        {
          label: props.statsKey === "weight" ? "Weight" : props.statsKey === "bodyfat" ? "Percentage" : "Size",
          value: (self, rawValue) => `${rawValue} ${props.units}`,
          stroke: "red",
          width: 1,
        },
        movingAverageWindowSize != null
          ? {
              label: "Moving Average",
              value: (self, rawValue) => `${rawValue} ${props.units}`,
              stroke: "blue",
              width: 1,
            }
          : {},
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
      <div
        data-cy="graph-legend"
        className={`box-content h-6 px-8 ${props.title === null ? "pt-2" : "pt-8"} pb-2 text-sm text-center`}
        ref={legendRef}
      ></div>
    </div>
  );
}
