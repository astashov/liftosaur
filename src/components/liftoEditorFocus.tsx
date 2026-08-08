import { createContext, JSX, ReactNode, useContext, useEffect, useRef, useSyncExternalStore } from "react";
import type { ILiftoEditorController } from "./liftoEditorController";

export interface ILiftoEditorFocusEntry {
  id: string;
  controller: ILiftoEditorController;
}

// An external store rather than context state on purpose: the focused editor republishes its
// controller on every session change, and holding that in state above the editors would
// re-render them, which would republish again. Here only the dock subscribes, so a claim
// never reaches back into the editors.
class LiftoEditorFocusStore {
  private entry: ILiftoEditorFocusEntry | undefined;
  private blurCurrent: (() => void) | undefined;
  private readonly listeners = new Set<() => void>();

  public claim(id: string, controller: ILiftoEditorController, blur: () => void): void {
    if (this.entry != null && this.entry.id !== id) {
      this.blurCurrent?.();
    }
    this.blurCurrent = blur;
    this.entry = { id, controller };
    this.emit();
  }

  public release(id: string): void {
    if (this.entry?.id !== id) {
      return;
    }
    this.entry = undefined;
    this.blurCurrent = undefined;
    this.emit();
  }

  public blurFocused(): void {
    this.blurCurrent?.();
    this.entry = undefined;
    this.blurCurrent = undefined;
    this.emit();
  }

  public readonly getEntry = (): ILiftoEditorFocusEntry | undefined => this.entry;

  public readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit(): void {
    for (const listener of Array.from(this.listeners)) {
      listener();
    }
  }
}

const LiftoEditorFocusContext = createContext<LiftoEditorFocusStore | undefined>(undefined);

const noopSubscribe = (): (() => void) => () => undefined;
const noopEntry = (): ILiftoEditorFocusEntry | undefined => undefined;

export function LiftoEditorFocusProvider(props: { children: ReactNode }): JSX.Element {
  const storeRef = useRef<LiftoEditorFocusStore | undefined>(undefined);
  if (storeRef.current == null) {
    storeRef.current = new LiftoEditorFocusStore();
  }
  return <LiftoEditorFocusContext.Provider value={storeRef.current}>{props.children}</LiftoEditorFocusContext.Provider>;
}

// An editor holds the dock exactly while it has a focus stack. No dependency array: the claim
// has to republish on every render of the focused editor so the dock sees the current pills.
//
// Releasing on the way out matters as much as claiming: an editor that only ever claimed would
// stop republishing once it lost focus, leaving the store holding a stale controller — the dock
// would then render from a mode and pill set that no longer exist.
export function useLiftoEditorFocusClaim(id: string, controller: ILiftoEditorController): void {
  const store = useContext(LiftoEditorFocusContext);
  const blurRef = useRef(controller.blur);
  blurRef.current = controller.blur;
  const hasFocus = controller.context != null;
  useEffect(() => {
    if (store == null) {
      return;
    }
    if (hasFocus) {
      store.claim(id, controller, () => blurRef.current());
    } else {
      store.release(id);
    }
  });
  useEffect(() => {
    return () => store?.release(id);
  }, [store, id]);
}

export function useLiftoEditorFocusEntry(): ILiftoEditorFocusEntry | undefined {
  const store = useContext(LiftoEditorFocusContext);
  return useSyncExternalStore(store?.subscribe ?? noopSubscribe, store?.getEntry ?? noopEntry, noopEntry);
}

export function useLiftoEditorBlurFocused(): () => void {
  const store = useContext(LiftoEditorFocusContext);
  return () => store?.blurFocused();
}
