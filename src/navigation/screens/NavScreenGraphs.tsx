import { JSX } from "react";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { ScreenGraphs as ScreenGraphsComponent } from "../../components/screenGraphs";

export function NavScreenGraphs(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <ScreenGraphsComponent
      navCommon={navCommon}
      settings={state.storage.settings}
      dispatch={dispatch}
      history={state.storage.history}
      stats={state.storage.stats}
    />
  );
}
