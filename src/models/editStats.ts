import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import {
  ILength,
  IPercentage,
  ISettings,
  IStatsLength,
  IStatsLengthValue,
  IStatsPercentage,
  IStatsPercentageValue,
  IStatsWeight,
  IStatsWeightValue,
  IWeight,
} from "../types";
import { IState } from "./state";
import { ObjectUtils } from "../utils/object";
import { CollectionUtils } from "../utils/collection";
import { Weight } from "./weight";
import { Length } from "./length";

export interface IHealthResponse {
  added: {
    timestamp: number;
    type: "bodyweight" | "bodyfat" | "waist";
    uuid: string;
    value: IWeight | IPercentage | ILength;
  }[];
  anchor: string;
  deleted: string[];
}

export namespace EditStats {
  export function toggleWeightStats(dispatch: IDispatch, name: keyof IStatsWeight, value: boolean): void {
    dispatch({
      type: "UpdateSettings",
      lensRecording: lb<ISettings>().p("statsEnabled").p("weight").p(name).record(value),
    });
  }

  export function toggleLengthStats(dispatch: IDispatch, name: keyof IStatsLength, value: boolean): void {
    dispatch({
      type: "UpdateSettings",
      lensRecording: lb<ISettings>().p("statsEnabled").p("length").p(name).record(value),
    });
  }

  export function togglePercentageStats(dispatch: IDispatch, name: keyof IStatsPercentage, value: boolean): void {
    dispatch({
      type: "UpdateSettings",
      lensRecording: lb<ISettings>().p("statsEnabled").p("percentage").p(name).record(value),
    });
  }

  export function addWeightStats(dispatch: IDispatch, payload: Partial<Record<keyof IStatsWeight, IWeight>>): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("stats")
          .p("weight")
          .recordModify((st) => {
            return ObjectUtils.keys(payload).reduce(
              (memo, key) => {
                memo[key] = [
                  { value: payload[key]!, timestamp: Date.now(), updatedAt: Date.now() },
                  ...(memo[key] || []),
                ];
                return memo;
              },
              { ...st }
            );
          }),
      ],
    });
  }

  export function addLengthStats(dispatch: IDispatch, payload: Partial<Record<keyof IStatsLength, ILength>>): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("stats")
          .p("length")
          .recordModify((st) => {
            return ObjectUtils.keys(payload).reduce(
              (memo, key) => {
                memo[key] = [
                  { value: payload[key]!, timestamp: Date.now(), updatedAt: Date.now() },
                  ...(memo[key] || []),
                ];
                return memo;
              },
              { ...st }
            );
          }),
      ],
    });
  }

  export function addPercentageStats(
    dispatch: IDispatch,
    payload: Partial<Record<keyof IStatsPercentage, IPercentage>>
  ): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("stats")
          .p("percentage")
          .recordModify((st) => {
            return ObjectUtils.keys(payload).reduce(
              (memo, key) => {
                memo[key] = [
                  { value: payload[key]!, timestamp: Date.now(), updatedAt: Date.now() },
                  ...(memo[key] || []),
                ];
                return memo;
              },
              { ...st }
            );
          }),
      ],
    });
  }

  export function changeStatWeightValue(
    dispatch: IDispatch,
    key: keyof IStatsWeight,
    index: number,
    value: IWeight
  ): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("stats")
          .p("weight")
          .p(key)
          .i(index)
          .recordModify((v) => ({ ...v, value, updatedAt: Date.now() })),
      ],
    });
  }

  export function changeStatLengthValue(
    dispatch: IDispatch,
    key: keyof IStatsLength,
    index: number,
    value: ILength
  ): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("stats")
          .p("length")
          .p(key)
          .i(index)
          .recordModify((v) => ({ ...v, value, updatedAt: Date.now() })),
      ],
    });
  }

  export function changeStatPercentageValue(
    dispatch: IDispatch,
    key: keyof IStatsPercentage,
    index: number,
    value: IPercentage
  ): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("stats")
          .p("percentage")
          .p(key)
          .i(index)
          .recordModify((v) => ({ ...v, value, updatedAt: Date.now() })),
      ],
    });
  }

  export function changeStatWeightTimestamp(
    dispatch: IDispatch,
    key: keyof IStatsWeight,
    index: number,
    timestamp: number
  ): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("stats")
          .p("weight")
          .p(key)
          .recordModify((coll) => {
            return CollectionUtils.sort(
              [...(coll || [])].map((v, i) => (i === index ? { ...v, timestamp, updatedAt: Date.now() } : v)),
              (a, b) => b.timestamp - a.timestamp
            );
          }),
      ],
    });
  }

  export function changeStatLengthTimestamp(
    dispatch: IDispatch,
    key: keyof IStatsLength,
    index: number,
    timestamp: number
  ): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("stats")
          .p("length")
          .p(key)
          .recordModify((coll) => {
            return CollectionUtils.sort(
              [...(coll || [])].map((v, i) => (i === index ? { ...v, timestamp, updatedAt: Date.now() } : v)),
              (a, b) => b.timestamp - a.timestamp
            );
          }),
      ],
    });
  }

  export function changeStatPercentageTimestamp(
    dispatch: IDispatch,
    key: keyof IStatsPercentage,
    index: number,
    timestamp: number
  ): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("stats")
          .p("percentage")
          .p(key)
          .recordModify((coll) => {
            return CollectionUtils.sort(
              [...(coll || [])].map((v, i) => (i === index ? { ...v, timestamp, updatedAt: Date.now() } : v)),
              (a, b) => b.timestamp - a.timestamp
            );
          }),
      ],
    });
  }

  export function deleteWeightStat(dispatch: IDispatch, key: keyof IStatsWeight, index: number, ts: number): void {
    dispatch({
      type: "UpdateState",
      desc: "Delete weight stat",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("stats")
          .p("weight")
          .p(key)
          .recordModify((s) => [...(s || [])].filter((_, i) => i !== index)),
        lb<IState>()
          .p("storage")
          .p("deletedStats")
          .recordModify((deletedStats) => [...deletedStats, ts]),
      ],
    });
  }

  export function deleteLengthStat(dispatch: IDispatch, key: keyof IStatsLength, index: number, ts: number): void {
    dispatch({
      type: "UpdateState",
      desc: "Delete length stat",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("stats")
          .p("length")
          .p(key)
          .recordModify((s) => [...(s || [])].filter((_, i) => i !== index)),
        lb<IState>()
          .p("storage")
          .p("deletedStats")
          .recordModify((deletedStats) => [...deletedStats, ts]),
      ],
    });
  }

  export function deletePercentageStat(
    dispatch: IDispatch,
    key: keyof IStatsPercentage,
    index: number,
    ts: number
  ): void {
    dispatch({
      type: "UpdateState",
      desc: "Delete percentage stat",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("stats")
          .p("percentage")
          .p(key)
          .recordModify((s) => [...(s || [])].filter((_, i) => i !== index)),
        lb<IState>()
          .p("storage")
          .p("deletedStats")
          .recordModify((deletedStats) => [...deletedStats, ts]),
      ],
    });
  }

  export function uploadHealthStats(
    platform: "ios" | "android",
    dispatch: IDispatch,
    dataAny: unknown,
    settings: ISettings,
    deletedStatsArr: number[]
  ): void {
    const deletedStats = new Set(deletedStatsArr);
    const response = dataAny as { data: IHealthResponse };
    const data = response.data;
    if (!data.added) {
      return;
    }
    const weightValues: IStatsWeightValue[] = [];
    const bodyfatValues: IStatsPercentageValue[] = [];
    const waistValues: IStatsLengthValue[] = [];

    for (const d of data.added) {
      if (deletedStats.has(d.timestamp)) {
        continue;
      }
      if (d.type === "bodyweight") {
        weightValues.push({
          value: Weight.roundTo005(Weight.convertTo(d.value as IWeight, settings.units)),
          timestamp: d.timestamp,
          updatedAt: Date.now(),
          ...(platform === "ios" ? { appleUuid: d.uuid } : { googleUuid: d.uuid }),
        });
      } else if (d.type === "bodyfat") {
        bodyfatValues.push({
          value: d.value as IPercentage,
          timestamp: d.timestamp,
          updatedAt: Date.now(),
          ...(platform === "ios" ? { appleUuid: d.uuid } : { googleUuid: d.uuid }),
        });
      } else if (d.type === "waist") {
        waistValues.push({
          value: Length.convertTo(d.value as ILength, settings.lengthUnits),
          timestamp: d.timestamp,
          updatedAt: Date.now(),
          ...(platform === "ios" ? { appleUuid: d.uuid } : { googleUuid: d.uuid }),
        });
      }
    }

    const applyValues = <T extends { timestamp: number }>(st: T[] | undefined, values: T[]): T[] => {
      return CollectionUtils.sortBy(CollectionUtils.uniqBy([...(st || []), ...values], "timestamp"), "timestamp", true);
    };

    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("stats")
          .p("weight")
          .p("weight")
          .recordModify((st) => applyValues(st, weightValues)),
        lb<IState>()
          .p("storage")
          .p("stats")
          .p("percentage")
          .p("bodyfat")
          .recordModify((st) => applyValues(st, bodyfatValues)),
        lb<IState>()
          .p("storage")
          .p("stats")
          .p("length")
          .p("waist")
          .recordModify((st) => applyValues(st, waistValues)),
        platform === "ios"
          ? lb<IState>().p("storage").p("settings").p("appleHealthAnchor").record(data.anchor)
          : lb<IState>().p("storage").p("settings").p("googleHealthAnchor").record(data.anchor),
      ],
    });
  }
}
