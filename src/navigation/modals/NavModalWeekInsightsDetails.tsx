import { JSX, useMemo } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { WeekInsightsDetails } from "../../components/weekInsights";
import { History_getPersonalRecords } from "../../models/history";
import { CollectionUtils_sort } from "../../utils/collection";
import { getWeekHistory } from "../../components/programHistory";
import { WeekInsightsUtils_calculateSetResults } from "../../utils/weekInsightsUtils";
import { navigationRef } from "../navigationRef";
import type { IRootStackParamList } from "../types";

export function NavModalWeekInsightsDetails(): JSX.Element {
  const { state } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "weekInsightsDetailsModal";
    params: IRootStackParamList["weekInsightsDetailsModal"];
  }>();
  const { selectedFirstDayOfWeek } = route.params;
  const settings = state.storage.settings;

  const sortedHistory = useMemo(
    () =>
      CollectionUtils_sort(state.storage.history, (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [state.storage.history]
  );
  const prs = History_getPersonalRecords(sortedHistory);
  const thisWeekHistory = getWeekHistory(sortedHistory, selectedFirstDayOfWeek, settings.startWeekFromMonday);
  const setResults = WeekInsightsUtils_calculateSetResults(thisWeekHistory, settings);

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true} isFullWidth={true}>
      <WeekInsightsDetails
        thisWeekHistory={thisWeekHistory}
        prs={prs}
        setResults={setResults}
        settings={settings}
        onOpenPlannerSettings={() => {
          navigationRef.navigate("plannerSettingsModal", { context: "programHistory" });
        }}
      />
    </ModalScreenContainer>
  );
}
