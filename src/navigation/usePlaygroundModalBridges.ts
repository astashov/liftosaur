import { useEffect, useRef } from "react";
import { IState } from "../models/state";
import { navigationRef } from "./navigationRef";

interface IPlaygroundModalState {
  editSetModal: boolean;
  amrapModal: boolean;
}

function findActivePlaygroundModal(
  state: IState
): { weekIndex: number; dayIndex: number; modal: IPlaygroundModalState } | undefined {
  const progresses = state.playgroundState?.progresses;
  if (!progresses) {
    return undefined;
  }
  for (let weekIndex = 0; weekIndex < progresses.length; weekIndex++) {
    const week = progresses[weekIndex];
    for (let dayIndex = 0; dayIndex < week.days.length; dayIndex++) {
      const day = week.days[dayIndex];
      const ui = day.progress.ui;
      if (ui?.editSetModal || ui?.amrapModal) {
        return {
          weekIndex,
          dayIndex,
          modal: {
            editSetModal: ui.editSetModal != null,
            amrapModal: ui.amrapModal != null,
          },
        };
      }
    }
  }
  return undefined;
}

export function usePlaygroundModalBridges(state: IState): void {
  const active = findActivePlaygroundModal(state);

  const prevEditSetModal = useRef(false);
  const prevAmrapModal = useRef(false);

  useEffect(() => {
    if (active?.modal.editSetModal && !prevEditSetModal.current) {
      navigationRef.navigate("editSetTargetModal", {
        context: "playground",
        weekIndex: active.weekIndex,
        dayIndex: active.dayIndex,
      });
    }
    prevEditSetModal.current = active?.modal.editSetModal ?? false;
  }, [active?.modal.editSetModal, active?.weekIndex, active?.dayIndex]);

  useEffect(() => {
    if (active?.modal.amrapModal && !prevAmrapModal.current) {
      const progress = state.playgroundState?.progresses[active.weekIndex]?.days[active.dayIndex]?.progress;
      const amrapModal = progress?.ui?.amrapModal;
      if (amrapModal) {
        navigationRef.navigate("amrapModal", {
          ...amrapModal,
          context: "playground",
          weekIndex: active.weekIndex,
          dayIndex: active.dayIndex,
        });
      }
    }
    prevAmrapModal.current = active?.modal.amrapModal ?? false;
  }, [active?.modal.amrapModal, active?.weekIndex, active?.dayIndex]);
}
