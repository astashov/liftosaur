import { Reducer } from "preact/hooks";
import { IAction, reducerWrapper } from "../../src/ducks/reducer";
import { Storage_isChanged } from "../../src/models/storage";
import { NoRetryError, Thunk_sync2 } from "../../src/ducks/thunks";
import { IGThunk, IReducerOnIGAction } from "../../src/ducks/types";
import { IEnv, IState } from "../../src/models/state";
import { ObjectUtils_clone } from "../../src/utils/object";

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
        if (Storage_isChanged(oldState.storage, newState.storage)) {
          try {
            await dispatch(Thunk_sync2());
          } catch (e) {
            if (e instanceof NoRetryError && e.message === "Network Error") {
              // Ignore
            } else {
              throw e;
            }
          }
        }
      },
    ]);
  }

  public static clone(
    mockReducer: MockReducer<IState, IAction, IEnv>,
    deviceId: string,
    env: IEnv
  ): MockReducer<IState, IAction, IEnv> {
    return MockReducer.build(ObjectUtils_clone({ ...mockReducer.state, deviceId }), env);
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
