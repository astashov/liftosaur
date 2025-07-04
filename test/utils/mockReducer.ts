import { Reducer } from "preact/hooks";
import { IAction, reducerWrapper } from "../../src/ducks/reducer";
import { Storage } from "../../src/models/storage";
import { Thunk } from "../../src/ducks/thunks";
import { IGThunk, IReducerOnIGAction } from "../../src/ducks/types";
import { IEnv, IState, updateState } from "../../src/models/state";
import { VersionTracker } from "../../src/models/versionTracker";
import { STORAGE_VERSION_TYPES } from "../../src/types";
import { lb } from "lens-shmens";

export class MockReducer<TState, TAction extends Record<string, unknown>, TEnv> {
  public state: TState;
  public runningActions: (TAction | IGThunk<TState, TAction, TEnv>)[] = [];

  constructor(
    public reducer: Reducer<TState, TAction>,
    public initialState: TState,
    public env: TEnv,
    public onActions: IReducerOnIGAction<TState, TAction, TEnv>[]
  ) {
    this.state = this.initialState;
  }

  public static build(state: IState, env: IEnv): MockReducer<IState, IAction, IEnv> {
    return new MockReducer(reducerWrapper(true), state, env, [
      async (dispatch, action, oldState, newState) => {
        if (Storage.isChanged(oldState.storage, newState.storage)) {
          const timestamp = Date.now();
          const storageVersionTracker = new VersionTracker(STORAGE_VERSION_TYPES);
          const versions = storageVersionTracker.updateVersions(
            oldState.storage,
            newState.storage,
            newState.storage._versions || {},
            timestamp
          );
          if (versions !== newState.storage._versions) {
            updateState(dispatch, [lb<IState>().p("storage").p("_versions").record(versions)], "versions");
          }
          await dispatch(Thunk.sync2());
        }
      },
    ]);
  }

  private readonly getState = (): TState => {
    return this.state;
  };

  private readonly dispatch = (action: IGThunk<TState, TAction, TEnv> | TAction): Promise<void> | void => {
    if (typeof action === "function") {
      return new Promise(async (resolve, reject) => {
        try {
          await action(
            (a) => {
              this.runningActions.push(a);
              this.dispatch(a);
            },
            this.getState,
            this.env
          );
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    } else {
      this.state = this.reducer(this.state, action);
    }
  };

  public async run(initialActions: (TAction | IGThunk<TState, TAction, TEnv>)[]): Promise<void> {
    this.runningActions = [...initialActions];
    let action = this.runningActions.shift();
    while (action != null) {
      const oldState = this.getState();
      await this.dispatch(action);
      for (const onAction of this.onActions) {
        await onAction(this.dispatch, action, oldState, this.getState());
      }
      action = this.runningActions.shift();
    }
    this.runningActions = [];
  }
}
