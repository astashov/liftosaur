import { JSX } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { FormSheet } from "../FormSheet";
import { WorkoutSocialShareSheet } from "../../components/workoutSocialShareSheet";
import type { IRootStackParamList } from "../types";

export function NavModalSocialShare(): JSX.Element {
  const { state } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "socialShareModal"; params: IRootStackParamList["socialShareModal"] }>();
  const { type, progressId } = route.params;

  const record =
    progressId == null
      ? state.storage.history[0]
      : progressId === 0
        ? state.storage.progress?.[0]
        : state.progress[progressId];

  const content = (
    <WorkoutSocialShareSheet
      history={state.storage.history}
      record={record}
      settings={state.storage.settings}
      type={type}
      isHidden={false}
    />
  );

  return (
    <SheetScreenContainer onClose={() => navigation.goBack()} shouldShowClose={true}>
      <FormSheet>{content}</FormSheet>
    </SheetScreenContainer>
  );
}
