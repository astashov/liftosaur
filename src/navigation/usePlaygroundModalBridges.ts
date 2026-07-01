import { useEffect, useRef } from "react";
import { IState } from "../models/state";
import { navigateToModal } from "./navigationService";

interface IPlaygroundModalState {
  editSetModal: boolean;
  amrapModal: boolean;
  editModal: boolean;
  // The set-timer nonce (not a boolean) so we push only for a genuinely new timer, like workout mode does.
  setTimerNonce: number | undefined;
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
      const progress = week.days[dayIndex].progress;
      const ui = progress.ui;
      // Track the raw nonce (no amrap gating): a timed AMRAP keeps the same setTimer/nonce behind the amrap
      // modal, so the nonce comparison below naturally avoids re-pushing the set-timer route that's still
      // mounted underneath — gating on `amrapModal == null` here would instead read as a fresh open.
      const setTimerNonce = progress.setTimer?.nonce;
      if (ui?.editSetModal || progress.amrapModal || ui?.editModal || setTimerNonce != null) {
        return {
          weekIndex,
          dayIndex,
          modal: {
            editSetModal: ui?.editSetModal != null,
            amrapModal: progress.amrapModal != null,
            editModal: ui?.editModal != null,
            setTimerNonce,
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
  const prevEditModal = useRef(false);
  const prevSetTimerNonce = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (active?.modal.editSetModal && !prevEditSetModal.current) {
      navigateToModal("editSetTargetModal", {
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
      const amrapModal = progress?.amrapModal;
      if (amrapModal) {
        navigateToModal("amrapModal", {
          ...amrapModal,
          context: "playground",
          weekIndex: active.weekIndex,
          dayIndex: active.dayIndex,
        });
      }
    }
    prevAmrapModal.current = active?.modal.amrapModal ?? false;
  }, [active?.modal.amrapModal, active?.weekIndex, active?.dayIndex]);

  useEffect(() => {
    if (active?.modal.editModal && !prevEditModal.current) {
      navigateToModal("playgroundEditModal", {
        context: "playground",
        weekIndex: active.weekIndex,
        dayIndex: active.dayIndex,
      });
    }
    prevEditModal.current = active?.modal.editModal ?? false;
  }, [active?.modal.editModal, active?.weekIndex, active?.dayIndex]);

  useEffect(() => {
    const nonce = active?.modal.setTimerNonce;
    // Push only when a genuinely new timer starts (nonce changes when a timed set's clock begins, and on each
    // EMOM/auto advance). A timed AMRAP keeps the same nonce, so answering it (incl. "Log & keep timing")
    // doesn't re-push the set-timer route still mounted underneath. Don't reset on clear — a new timer gets a
    // new nonce, and clearing already pops the route via NavModalSetTimer's shouldGoBack.
    if (active && nonce != null && nonce !== prevSetTimerNonce.current) {
      prevSetTimerNonce.current = nonce;
      navigateToModal("setTimerModal", {
        context: "playground",
        weekIndex: active.weekIndex,
        dayIndex: active.dayIndex,
      });
    }
  }, [active?.modal.setTimerNonce, active?.weekIndex, active?.dayIndex]);
}
