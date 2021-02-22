import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import { ILength, ISettings, IStatsLength, IStatsWeight, IWeight } from "../types";
import { IState } from "./state";
import { ObjectUtils } from "../utils/object";
import { CollectionUtils } from "../utils/collection";

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
                memo[key] = [{ value: payload[key]!, timestamp: Date.now() }, ...(memo[key] || [])];
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
                memo[key] = [{ value: payload[key]!, timestamp: Date.now() }, ...(memo[key] || [])];
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
          .recordModify((v) => ({ ...v, value })),
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
          .recordModify((v) => ({ ...v, value })),
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
              [...(coll || [])].map((v, i) => (i === index ? { ...v, timestamp } : v)),
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
              [...(coll || [])].map((v, i) => (i === index ? { ...v, timestamp } : v)),
              (a, b) => b.timestamp - a.timestamp
            );
          }),
      ],
    });
  }

  export function deleteWeightStat(dispatch: IDispatch, key: keyof IStatsWeight, index: number): void {
    dispatch({
      type: "UpdateState",
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

  export function deleteLengthStat(dispatch: IDispatch, key: keyof IStatsLength, index: number): void {
    dispatch({
      type: "UpdateState",
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
}
