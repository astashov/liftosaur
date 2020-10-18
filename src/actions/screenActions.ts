import { updateState, IState } from "../models/state";
import { IDispatch } from "../ducks/types";
import { IScreen } from "../models/screen";
import { lb } from "../utils/lens";

export namespace ScreenActions {
  export function setScreen(dispatch: IDispatch, screen: IScreen): void {
    updateState(dispatch, [lb<IState>().p("screenStack").record([screen])]);
  }
}
