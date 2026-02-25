import { updateState, IState } from "../models/state";
import { IDispatch } from "../ducks/types";
import { IScreen, IScreenData } from "../models/screen";
import { lb } from "lens-shmens";

export function ScreenActions_setScreen<T extends IScreen>(dispatch: IDispatch, screen: T): void {
  updateState(
    dispatch,
    [
      lb<IState>()
        .p("screenStack")
        .record([{ name: screen } as Extract<IScreenData, { name: T }>]),
    ],
    `Set screen to ${screen}`
  );
}
