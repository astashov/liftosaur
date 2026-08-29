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
  // Whoever the user is editing in, which is a wider set than the dock's entry: a freeform
  // editor has no focus stack to show, but it does hold the system keyboard, and that has to
  // be handed over when another editor takes the screen.
  private occupant: { id: string; evict: () => void } | undefined;
  // The occupant when it's a freeform editor, republished on every render like `entry` — the
  // dock renders its suggestion strip, and that has to follow the caret.
  private freeformEntry: ILiftoEditorFocusEntry | undefined;
  private readonly listeners = new Set<() => void>();

  public claim(id: string, controller: ILiftoEditorController, evict: () => void): void {
    this.takeOver(id, evict);
    this.entry = { id, controller };
    this.freeformEntry = undefined;
    this.emit();
  }

  // Freeform occupies the screen without holding the dock — the entry has to go even though
  // the same editor is still the one being edited.
  public occupy(id: string, controller: ILiftoEditorController, evict: () => void): void {
    this.takeOver(id, evict);
    if (this.entry?.id === id) {
      this.entry = undefined;
    }
    this.freeformEntry = { id, controller };
    this.emit();
  }

  public release(id: string): void {
    if (this.occupant?.id === id) {
      this.occupant = undefined;
    }
    const hadFreeform = this.freeformEntry?.id === id;
    if (hadFreeform) {
      this.freeformEntry = undefined;
    }
    if (this.entry?.id !== id) {
      if (hadFreeform) {
        this.emit();
      }
      return;
    }
    this.entry = undefined;
    this.emit();
  }

  // The dock's own dismissal, so it closes the keypad too — unlike a handover, where the
  // incoming editor owns whatever the keypad is showing.
  public blurFocused(): void {
    const entry = this.entry;
    this.occupant = undefined;
    this.entry = undefined;
    this.freeformEntry = undefined;
    entry?.controller.blur();
    this.emit();
  }

  // Eviction runs after the handover is recorded: it dispatches into the outgoing editor,
  // which re-runs its own claim effect, and a store still pointing at it would take the
  // registration back.
  private takeOver(id: string, evict: () => void): void {
    const previous = this.occupant;
    this.occupant = { id, evict };
    if (previous != null && previous.id !== id) {
      previous.evict();
    }
  }

  public readonly getEntry = (): ILiftoEditorFocusEntry | undefined => this.entry;

  public readonly getFreeformEntry = (): ILiftoEditorFocusEntry | undefined => this.freeformEntry;

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
  const evictRef = useRef(controller.evict);
  evictRef.current = controller.evict;
  const hasFocus = controller.context != null;
  const isFreeform = controller.mode === "freeform";
  useEffect(() => {
    if (store == null) {
      return;
    }
    if (hasFocus) {
      store.claim(id, controller, () => evictRef.current());
    } else if (isFreeform) {
      store.occupy(id, controller, () => evictRef.current());
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

// Freeform holds no dock, but it does hold the system keyboard — this is what the dock renders
// the suggestion strip from.
export function useLiftoEditorFreeformEntry(): ILiftoEditorFocusEntry | undefined {
  const store = useContext(LiftoEditorFocusContext);
  return useSyncExternalStore(store?.subscribe ?? noopSubscribe, store?.getFreeformEntry ?? noopEntry, noopEntry);
}

export function useLiftoEditorBlurFocused(): () => void {
  const store = useContext(LiftoEditorFocusContext);
  return () => store?.blurFocused();
}
