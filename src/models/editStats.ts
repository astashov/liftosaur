import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import {
  ILength,
  IPercentage,
  ISettings,
  IStatsHealth,
  IStatsHealthKey,
  IStatsHealthValue,
  IStatsLength,
  IStatsLengthValue,
  IStatsPercentage,
  IStatsPercentageValue,
  IStatsWeight,
  IStatsWeightValue,
  IWeight,
  statsHealthDef,
} from "../types";
import { IHealthDailyResult, IHealthDailyValue } from "../utils/healthAdapter";
import { IState } from "./state";
import { ObjectUtils_keys } from "../utils/object";
import { CollectionUtils_sort, CollectionUtils_sortBy, CollectionUtils_uniqBy } from "../utils/collection";
import { Weight_roundTo005, Weight_convertTo } from "./weight";
import { Length_convertTo } from "./length";

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

export function EditStats_toggleWeightStats(dispatch: IDispatch, name: keyof IStatsWeight, value: boolean): void {
  dispatch({
    type: "UpdateSettings",
    lensRecording: lb<ISettings>().p("statsEnabled").p("weight").p(name).record(value),
    desc: `Toggle ${name} weight stat`,
  });
}

export function EditStats_toggleLengthStats(dispatch: IDispatch, name: keyof IStatsLength, value: boolean): void {
  dispatch({
    type: "UpdateSettings",
    lensRecording: lb<ISettings>().p("statsEnabled").p("length").p(name).record(value),
    desc: `Toggle ${name} length stat`,
  });
}

export function EditStats_togglePercentageStats(
  dispatch: IDispatch,
  name: keyof IStatsPercentage,
  value: boolean
): void {
  dispatch({
    type: "UpdateSettings",
    lensRecording: lb<ISettings>().p("statsEnabled").p("percentage").p(name).record(value),
    desc: `Toggle ${name} percentage stat`,
  });
}

export function EditStats_addWeightStats(
  dispatch: IDispatch,
  payload: Partial<Record<keyof IStatsWeight, IWeight>>,
  timestamp?: number
): void {
  const sharedTime = timestamp ?? Date.now();
  dispatch({
    type: "UpdateState",
    lensRecording: [
      lb<IState>()
        .p("storage")
        .p("stats")
        .p("weight")
        .recordModify((st) => {
          return ObjectUtils_keys(payload).reduce(
            (memo, key) => {
              memo[key] = [
                { vtype: "stat", value: payload[key]!, timestamp: sharedTime, updatedAt: sharedTime },
                ...(memo[key] || []),
              ];
              return memo;
            },
            { ...st }
          );
        }),
    ],
    desc: "Add weight stats",
  });
}

export function EditStats_addLengthStats(
  dispatch: IDispatch,
  payload: Partial<Record<keyof IStatsLength, ILength>>,
  timestamp?: number
): void {
  const sharedTime = timestamp ?? Date.now();
  dispatch({
    type: "UpdateState",
    lensRecording: [
      lb<IState>()
        .p("storage")
        .p("stats")
        .p("length")
        .recordModify((st) => {
          return ObjectUtils_keys(payload).reduce(
            (memo, key) => {
              memo[key] = [
                { vtype: "stat", value: payload[key]!, timestamp: sharedTime, updatedAt: sharedTime },
                ...(memo[key] || []),
              ];
              return memo;
            },
            { ...st }
          );
        }),
    ],
    desc: "Add length stats",
  });
}

export function EditStats_addPercentageStats(
  dispatch: IDispatch,
  payload: Partial<Record<keyof IStatsPercentage, IPercentage>>,
  timestamp?: number
): void {
  const sharedTime = timestamp ?? Date.now();
  dispatch({
    type: "UpdateState",
    lensRecording: [
      lb<IState>()
        .p("storage")
        .p("stats")
        .p("percentage")
        .recordModify((st) => {
          return ObjectUtils_keys(payload).reduce(
            (memo, key) => {
              memo[key] = [
                {
                  vtype: "stat",
                  value: payload[key]!,
                  timestamp: sharedTime,
                  updatedAt: sharedTime,
                },
                ...(memo[key] || []),
              ];
              return memo;
            },
            { ...st }
          );
        }),
    ],
    desc: "Add percentage stats",
  });
}

export function EditStats_changeStatWeightValue(
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
    desc: `Change weight stat ${key} at index ${index} to ${value?.value}`,
  });
}

export function EditStats_changeStatLengthValue(
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
    desc: `Change length stat ${key} at index ${index} to ${value?.value}`,
  });
}

export function EditStats_changeStatPercentageValue(
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
    desc: `Change percentage stat ${key} at index ${index} to ${value?.value}`,
  });
}

export function EditStats_changeStatWeightTimestamp(
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
          return CollectionUtils_sort(
            [...(coll || [])].map((v, i) => (i === index ? { ...v, timestamp, updatedAt: Date.now() } : v)),
            (a, b) => b.timestamp - a.timestamp
          );
        }),
    ],
    desc: `Change weight stat ${key} timestamp at index ${index} to ${timestamp}`,
  });
}

export function EditStats_changeStatLengthTimestamp(
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
          return CollectionUtils_sort(
            [...(coll || [])].map((v, i) => (i === index ? { ...v, timestamp, updatedAt: Date.now() } : v)),
            (a, b) => b.timestamp - a.timestamp
          );
        }),
    ],
    desc: `Change length stat ${key} timestamp at index ${index} to ${timestamp}`,
  });
}

export function EditStats_changeStatPercentageTimestamp(
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
          return CollectionUtils_sort(
            [...(coll || [])].map((v, i) => (i === index ? { ...v, timestamp, updatedAt: Date.now() } : v)),
            (a, b) => b.timestamp - a.timestamp
          );
        }),
    ],
    desc: `Change percentage stat ${key} timestamp at index ${index} to ${timestamp}`,
  });
}

export function EditStats_deleteWeightStat(
  dispatch: IDispatch,
  key: keyof IStatsWeight,
  index: number,
  ts: number
): void {
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
    ],
  });
}

export function EditStats_deleteLengthStat(
  dispatch: IDispatch,
  key: keyof IStatsLength,
  index: number,
  ts: number
): void {
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
    ],
  });
}

export function EditStats_deletePercentageStat(
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
    ],
  });
}

export function EditStats_uploadHealthStats(
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
        vtype: "stat",
        value: Weight_roundTo005(Weight_convertTo(d.value as IWeight, settings.units)),
        timestamp: d.timestamp,
        updatedAt: Date.now(),
        ...(platform === "ios" ? { appleUuid: d.uuid } : { googleUuid: d.uuid }),
      });
    } else if (d.type === "bodyfat") {
      if (d.value.value > 0) {
        bodyfatValues.push({
          vtype: "stat",
          value: d.value as IPercentage,
          timestamp: d.timestamp,
          updatedAt: Date.now(),
          ...(platform === "ios" ? { appleUuid: d.uuid } : { googleUuid: d.uuid }),
        });
      }
    } else if (d.type === "waist") {
      waistValues.push({
        vtype: "stat",
        value: Length_convertTo(d.value as ILength, settings.lengthUnits),
        timestamp: d.timestamp,
        updatedAt: Date.now(),
        ...(platform === "ios" ? { appleUuid: d.uuid } : { googleUuid: d.uuid }),
      });
    }
  }

  const applyValues = <T extends { timestamp: number }>(st: T[] | undefined, values: T[]): T[] | undefined => {
    if (values.length === 0) {
      return st;
    }
    const merged = CollectionUtils_uniqBy([...(st || []), ...values], "timestamp");
    if (st != null && merged.length === st.length) {
      return st;
    }
    return CollectionUtils_sortBy(merged, "timestamp", true);
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
    desc: `Upload health stats from ${platform}`,
  });
}

export function EditStats_setHealthStatHidden(
  dispatch: IDispatch,
  key: IStatsHealthKey,
  timestamp: number,
  hidden: boolean
): void {
  dispatch({
    type: "UpdateState",
    desc: hidden ? "Hide health stat" : "Unhide health stat",
    lensRecording: [
      lb<IState>()
        .p("storage")
        .p("stats")
        .p("health")
        .recordModify((health) => {
          const next: IStatsHealth = { ...(health || {}) };
          next[key] = [...(next[key] || [])].map((v) => (v.timestamp === timestamp ? { ...v, hidden } : v));
          return next;
        }),
    ],
  });
}

export function EditStats_uploadDailyMetrics(
  platform: "ios" | "android",
  dispatch: IDispatch,
  result: IHealthDailyResult
): void {
  const byKey: Record<IStatsHealthKey, IHealthDailyValue[]> = { sleep: [], calories: [], protein: [] };
  for (const v of result.values) {
    byKey[v.type].push(v);
  }
  const now = Date.now();

  // Daily aggregates are re-read over a rolling window each sync, so a day's total can change.
  // Upsert by timestamp (replace same-day) rather than dedup-keep-first like measurements, carrying
  // the user's `hidden` flag forward so hidden records stay hidden across re-syncs. When a day's value
  // and source uuid are unchanged we keep the exact previous object (with its `updatedAt`) so
  // VersionTracker doesn't treat the whole rolling window as changed on every sync.
  //
  // We intentionally KEEP existing days that are absent from the latest read rather than treating
  // absence as a source-side deletion. HealthKit doesn't expose read-authorization status, so an
  // empty/partial read is indistinguishable from revoked permission - auto-deleting on absence would
  // risk silently wiping a user's history. Edits to a day ARE mirrored (same-day replace); a fully
  // deleted source day lingers until the user hides it in the app.
  const upsert = (
    existing: IStatsHealthValue[] | undefined,
    incoming: IHealthDailyValue[]
  ): IStatsHealthValue[] | undefined => {
    if (incoming.length === 0) {
      return existing;
    }
    const existingByTimestamp = new Map((existing || []).map((v) => [v.timestamp, v]));
    const incomingByTimestamp = new Set(incoming.map((v) => v.timestamp));
    const merged = incoming.map((inc): IStatsHealthValue => {
      const prev = existingByTimestamp.get(inc.timestamp);
      const prevUuid = platform === "ios" ? prev?.appleUuid : prev?.googleUuid;
      if (prev != null && prev.value === inc.value && prevUuid === inc.uuid) {
        return prev;
      }
      const next: IStatsHealthValue = {
        vtype: "stat",
        value: inc.value,
        timestamp: inc.timestamp,
        updatedAt: now,
        ...(platform === "ios" ? { appleUuid: inc.uuid } : { googleUuid: inc.uuid }),
      };
      if (prev?.hidden) {
        next.hidden = true;
      }
      return next;
    });
    const kept = (existing || []).filter((v) => !incomingByTimestamp.has(v.timestamp));
    return CollectionUtils_sortBy([...kept, ...merged], "timestamp", true);
  };

  dispatch({
    type: "UpdateState",
    lensRecording: [
      lb<IState>()
        .p("storage")
        .p("stats")
        .p("health")
        .recordModify((health) => {
          const next: IStatsHealth = { ...(health || {}) };
          for (const key of statsHealthDef) {
            const upserted = upsert(next[key], byKey[key]);
            if (upserted != null) {
              next[key] = upserted;
            }
          }
          return next;
        }),
    ],
    desc: `Upload daily health metrics from ${platform}`,
  });
}
