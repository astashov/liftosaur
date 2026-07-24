import { JSX } from "react";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenGraphs as ScreenGraphsComponent } from "../../components/screenGraphs";
import { useScreenPerf } from "../../utils/useScreenPerf";
import { usePerfRenderCount } from "../../utils/usePerfRenderCount";

export function NavScreenGraphs(): JSX.Element {
  useScreenPerf("graphsList");
  usePerfRenderCount("NavScreenGraphs");
  return (
    <NavScreenContent>
      <ScreenGraphsComponent />
    </NavScreenContent>
  );
}
