import { JSX, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { BottomSheetWorkoutSupersetContent } from "../../components/bottomSheetWorkoutSuperset";
import { IHistoryRecord } from "../../types";
import { updateProgress } from "../../models/state";
import { lb } from "lens-shmens";
import type { IRootStackParamList } from "../types";

export function NavModalWorkoutSuperset(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "supersetPickerModal";
    params: IRootStackParamList["supersetPickerModal"];
  }>();
  const { progressId } = route.params;

  const progress = progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];
  const exerciseSuperset = progress?.ui?.showSupersetPicker;

  const onClose = (): void => {
    updateProgress(
      dispatch,
      [lb<IHistoryRecord>().pi("ui").p("showSupersetPicker").record(undefined)],
      "Close superset picker"
    );
    navigation.goBack();
  };

  const shouldGoBack = !progress || !exerciseSuperset;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !progress || !exerciseSuperset) {
    return <></>;
  }

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <BottomSheetWorkoutSupersetContent
        progress={progress}
        entry={exerciseSuperset}
        settings={state.storage.settings}
        onSelect={(selectedEntry) => {
          updateProgress(
            dispatch,
            [lb<IHistoryRecord>().p("entries").findBy("id", exerciseSuperset.id).p("superset").record(selectedEntry)],
            "select-superset-entry"
          );
        }}
        onClose={onClose}
      />
    </SheetScreenContainer>
  );
}
