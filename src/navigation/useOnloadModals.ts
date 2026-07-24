import { useEffect, useRef } from "react";
import { navigateToModal } from "./navigationService";
import { IState } from "../models/state";
import { IDispatch } from "../ducks/types";
import { Thunk_maybeShowOnloadModal } from "../ducks/thunks";

// Run a side effect exactly once — the first time `isReady` flips true.
function useRunOnceWhenReady(isReady: boolean, fn: () => void): void {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const didRun = useRef(false);
  useEffect(() => {
    if (!isReady || didRun.current) {
      return;
    }
    didRun.current = true;
    fnRef.current();
  }, [isReady]);
}

// Fire `onEdge` on the false->true edge of `condition`, but only once nav is ready.
function useEdgeEffect(isReady: boolean, condition: boolean, onEdge: () => void): void {
  const onEdgeRef = useRef(onEdge);
  onEdgeRef.current = onEdge;
  const prev = useRef(false);
  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (condition && !prev.current) {
      onEdgeRef.current();
    }
    prev.current = condition;
  }, [isReady, condition]);
}

export function useOnloadModals(state: IState, dispatch: IDispatch, isNavReady: boolean): void {
  useEdgeEffect(isNavReady, !!(state.showWhatsNew && state.storage.whatsNew != null), () =>
    navigateToModal("whatsnewModal")
  );
  useEdgeEffect(isNavReady, !!state.showHearAboutUs, () => navigateToModal("hearAboutUsModal"));
  useRunOnceWhenReady(isNavReady, () => dispatch(Thunk_maybeShowOnloadModal()));
}
