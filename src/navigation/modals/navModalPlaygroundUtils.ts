import { IHistoryRecord, ISettings, IStats } from "../../types";
import { IDispatch } from "../../ducks/types";
import { IState, updateState } from "../../models/state";
import { buildCardsReducer, ICardsAction } from "../../ducks/reducer";
import { lb } from "lens-shmens";

export function getPlaygroundProgress(state: IState, weekIndex: number, dayIndex: number): IHistoryRecord | undefined {
  return state.playgroundState?.progresses[weekIndex]?.days[dayIndex]?.progress;
}

const cardActionTypes: Set<ICardsAction["type"]> = new Set([
  "UpdateProgress",
  "ChangeAMRAPAction",
  "CompleteSetAction",
]);

function isCardsAction(action: unknown): action is ICardsAction {
  return (
    typeof action === "object" &&
    action != null &&
    "type" in action &&
    cardActionTypes.has((action as ICardsAction).type)
  );
}

export function buildPlaygroundDispatch(
  dispatch: IDispatch,
  weekIndex: number,
  dayIndex: number,
  getProgress: () => IHistoryRecord | undefined,
  settings: ISettings,
  stats: IStats
): IDispatch {
  const lbProgress = lb<IState>()
    .pi("playgroundState")
    .pi("progresses")
    .pi(weekIndex)
    .p("days")
    .pi(dayIndex)
    .p("progress");

  return ((action: Parameters<IDispatch>[0]) => {
    if (isCardsAction(action)) {
      const progress = getProgress();
      if (progress) {
        const newProgress = buildCardsReducer(settings, stats, undefined)(progress, action);
        updateState(dispatch, [lbProgress.record(newProgress)], action.type);
      }
    } else {
      dispatch(action);
    }
  }) as IDispatch;
}
