import type { IState, ILocalStorage } from "@shared/models/state";
import { buildState } from "@shared/models/state";
import { Storage_get, Storage_getDefault } from "@shared/models/storage";
import { Persistence_loadLocalStorage, Persistence_saveLocalStorage } from "./persistence";
import { unrunMigrations } from "@shared/migrations/runner";

type IListener = (state: IState) => void;

export class StateStore {
  private state: IState;
  private storageKey: string = "liftosaur";
  private readonly listeners: Set<IListener> = new Set();

  constructor() {
    this.state = buildState({});
  }

  public getState(): IState {
    return this.state;
  }

  public setState(state: IState): void {
    this.state = state;
    this.persist();
    this.notify();
  }

  public subscribe(fn: IListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public async load(): Promise<void> {
    const { key, localStorage } = await Persistence_loadLocalStorage();
    this.storageKey = key;

    if (localStorage?.storage != null) {
      const maybeStorage = Storage_get(localStorage.storage, true);
      if (maybeStorage.success) {
        const hasUnrunMigrations = unrunMigrations(localStorage.storage).length > 0;
        const screenStack = maybeStorage.data.currentProgramId
          ? [{ name: "main" as const }]
          : [{ name: "first" as const }];
        this.state = {
          ...this.state,
          storage: maybeStorage.data,
          lastSyncedStorage: localStorage.lastSyncedStorage,
          screenStack,
          freshMigrations: hasUnrunMigrations,
        };
      }
    }
    this.notify();
  }

  private persist(): void {
    const localStorage: ILocalStorage = {
      storage: this.state.storage,
      lastSyncedStorage: this.state.lastSyncedStorage,
    };
    Persistence_saveLocalStorage(this.storageKey, localStorage);
  }

  private notify(): void {
    for (const fn of this.listeners) {
      fn(this.state);
    }
  }
}
