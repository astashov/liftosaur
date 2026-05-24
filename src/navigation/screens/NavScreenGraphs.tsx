import { JSX } from "react";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenGraphs as ScreenGraphsComponent } from "../../components/screenGraphs";
import { useScreenPerf } from "../../utils/useScreenPerf";

export function NavScreenGraphs(): JSX.Element {
  const { state, dispatch } = useAppState();
  useScreenPerf("graphsList");
  const navCommon = buildNavCommon(state);
  return (
    <NavScreenContent>
      <ScreenGraphsComponent
        navCommon={navCommon}
        settings={state.storage.settings}
        dispatch={dispatch}
        history={state.storage.history}
        stats={state.storage.stats}
      />
    </NavScreenContent>
  );
}
