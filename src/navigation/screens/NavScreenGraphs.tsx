import { JSX } from "react";
import { useRoute } from "@react-navigation/native";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenDashboard } from "../../components/screenDashboard";
import { ScreenDashboardEdit } from "../../components/screenDashboardEdit";
import { useScreenPerf } from "../../utils/useScreenPerf";
import { usePerfRenderCount } from "../../utils/usePerfRenderCount";
import type { IGraphsStackParamList } from "../types";

export function NavScreenGraphs(): JSX.Element {
  useScreenPerf("graphsList");
  usePerfRenderCount("NavScreenGraphs");
  return (
    <NavScreenContent>
      <ScreenDashboard />
    </NavScreenContent>
  );
}

export function NavScreenDashboardEdit(): JSX.Element {
  const route = useRoute<{ key: string; name: "dashboardEdit"; params: IGraphsStackParamList["dashboardEdit"] }>();
  return <ScreenDashboardEdit mode={route.params?.mode} caret={route.params?.caret} />;
}
