import { JSX } from "react";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenDashboard } from "../../components/screenDashboard";
import { useScreenPerf } from "../../utils/useScreenPerf";
import { usePerfRenderCount } from "../../utils/usePerfRenderCount";

export function NavScreenGraphs(): JSX.Element {
  useScreenPerf("graphsList");
  usePerfRenderCount("NavScreenGraphs");
  return (
    <NavScreenContent>
      <ScreenDashboard />
    </NavScreenContent>
  );
}
