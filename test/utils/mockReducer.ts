import { Reducer } from "preact/hooks";
import { IGThunk } from "../../src/ducks/types";

export class MockReducer<TState, TAction extends Record<string, unknown>, TEnv> {
  public state: TState;

  constructor(
    public reducer: Reducer<TState, TAction>,
    public initialState: TState,
    public env: TEnv,
    public onActions: Array<
      (action: TAction | IGThunk<TState, TAction, TEnv>, oldState: TState, newState: TState) => void | Promise<void>
    >
  ) {
    this.state = this.initialState;
  }

  private readonly getState = (): TState => {
    return this.state;
  };

  private readonly dispatch = async (action: IGThunk<TState, TAction, TEnv> | TAction): Promise<void> => {
    if (typeof action === "function") {
      const oldState = this.getState();
      await action(this.dispatch, this.getState, this.env);
      for (const onAction of this.onActions) {
        await onAction(action, oldState, this.getState());
      }
    } else {
      const oldState = this.getState();
      this.state = this.reducer(this.state, action);
      for (const onAction of this.onActions) {
        await onAction(action, oldState, this.getState());
      }
    }
  };

  public async run(actions: (TAction | IGThunk<TState, TAction, TEnv>)[]): Promise<void> {
    for (const action of actions) {
      await this.dispatch(action);
    }
  }
}
