import { Reducer } from "preact/hooks";
import { IGThunk, IReducerOnIGAction } from "../../src/ducks/types";

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

  private readonly getState = (): TState => {
    return this.state;
  };

  private readonly dispatch = async (action: IGThunk<TState, TAction, TEnv> | TAction): Promise<void> => {
    if (typeof action === "function") {
      await action(
        (a) => {
          this.runningActions.push(a);
        },
        this.getState,
        this.env
      );
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
