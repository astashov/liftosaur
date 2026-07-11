import { lb } from "lens-shmens";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "./state";
import { IHearAboutUs } from "../types";
import { Thunk_log } from "../ducks/thunks";
import type { IHearAboutUsSource } from "../components/hearAboutUs/hearAboutUsConfig";

function ensure(h: IHearAboutUs | undefined): IHearAboutUs {
  return h ?? { requests: [] };
}

function buildResult(source: string, detail: string, freeform: string): NonNullable<IHearAboutUs["result"]> {
  const result: NonNullable<IHearAboutUs["result"]> = { source, ts: Date.now() };
  if (detail) {
    result.detail = detail;
  }
  if (freeform) {
    result.freeform = freeform;
  }
  return result;
}

function detailJson(source: string, detail: string, freeform: string): string {
  const obj: Record<string, string> = { source };
  if (detail) {
    obj.detail = detail;
  }
  if (freeform) {
    obj.freeform = freeform;
  }
  return JSON.stringify(obj);
}

// Persist the source the instant it's tapped (partial answer) and log it, so the choice survives a
// skipped Step 2 or an app kill — critical for anonymous users whose IStorage never syncs.
export function HearAboutUs_selectSource(dispatch: IDispatch, source: IHearAboutUsSource): void {
  updateState(
    dispatch,
    [
      lb<IState>()
        .p("storage")
        .p("hearAboutUs")
        .recordModify((h) => ({ ...ensure(h), result: buildResult(source, "", "") })),
    ],
    "Select hear-about-us source"
  );
  dispatch(Thunk_log("ls-hear-about-us-answered", detailJson(source, "", "")));
}

export function HearAboutUs_updatePartial(dispatch: IDispatch, partial: { detail?: string; freeform?: string }): void {
  updateState(
    dispatch,
    [
      lb<IState>()
        .p("storage")
        .p("hearAboutUs")
        .recordModify((h) => {
          const base = ensure(h);
          if (base.result == null) {
            return base;
          }
          return { ...base, result: { ...base.result, ...partial, ts: Date.now() } };
        }),
    ],
    "Update hear-about-us"
  );
}

export function HearAboutUs_finalize(
  dispatch: IDispatch,
  payload: { source: IHearAboutUsSource; detail: string; freeform: string }
): void {
  updateState(
    dispatch,
    [
      lb<IState>()
        .p("storage")
        .p("hearAboutUs")
        .recordModify((h) => ({ ...ensure(h), result: buildResult(payload.source, payload.detail, payload.freeform) })),
      lb<IState>().p("toast").record("Thanks, that really helps! 🙏"),
    ],
    "Finalize hear-about-us"
  );
  dispatch(Thunk_log("ls-hear-about-us-answered", detailJson(payload.source, payload.detail, payload.freeform)));
}

export function HearAboutUs_logShown(dispatch: IDispatch): void {
  dispatch(Thunk_log("ls-hear-about-us-shown"));
}

export function HearAboutUs_skip(dispatch: IDispatch): void {
  dispatch(Thunk_log("ls-hear-about-us-skip"));
}

export function HearAboutUs_appendRequest(dispatch: IDispatch): void {
  updateState(
    dispatch,
    [
      lb<IState>()
        .p("storage")
        .p("hearAboutUs")
        .recordModify((h) => {
          const base = ensure(h);
          return { ...base, requests: [...base.requests, Date.now()] };
        }),
    ],
    "Hear-about-us maybe later"
  );
}

export function HearAboutUs_markDone(dispatch: IDispatch): void {
  updateState(
    dispatch,
    [
      lb<IState>()
        .p("storage")
        .p("hearAboutUs")
        .recordModify((h) => ({ ...ensure(h), done: true })),
    ],
    "Dismiss hear-about-us"
  );
}
