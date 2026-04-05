import { JSX, useCallback, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { MuscleGroupsContent } from "../../components/muscleGroupsContent";
import { IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";
import { lf } from "lens-shmens";
import { IPlannerState } from "../../pages/planner/models/types";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { Muscle_createMuscleGroup, Muscle_deleteMuscleGroup, Muscle_restoreMuscleGroup } from "../../models/muscle";
import type { IRootStackParamList } from "../types";

export function NavModalEditMuscleGroups(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "editMuscleGroupsModal";
    params: IRootStackParamList["editMuscleGroupsModal"];
  }>();
  const params = route.params;
  const settings = state.storage.settings;

  const onNewSettings = useCallback(
    (newSettings: typeof settings) => {
      updateState(dispatch, [lb<IState>().p("storage").p("settings").record(newSettings)], "Update planner settings");
    },
    [dispatch]
  );

  const onClose = (): void => {
    if (params.context === "editProgram") {
      const plannerState = state.editProgramStates?.[params.programId];
      if (plannerState) {
        const plannerDispatch = buildPlannerDispatch(
          dispatch,
          lb<IState>().p("editProgramStates").p(params.programId),
          plannerState
        );
        plannerDispatch(lb<IPlannerState>().p("ui").p("showEditMuscleGroups").record(false), "Close muscle groups");
      }
    }
    navigation.goBack();
  };

  const shouldGoBack = params.context === "editProgram" && !state.editProgramStates?.[params.programId];
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack) {
    return <></>;
  }

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <div className="px-4 py-2">
        <MuscleGroupsContent
          onCreate={(name) => {
            onNewSettings(
              lf(settings)
                .p("muscleGroups")
                .modify((muscleGroups) => Muscle_createMuscleGroup(muscleGroups, name))
            );
          }}
          onDelete={(muscleGroup) => {
            onNewSettings(
              lf(settings)
                .p("muscleGroups")
                .modify((muscleGroups) => Muscle_deleteMuscleGroup(muscleGroups, muscleGroup))
            );
          }}
          onRestore={(muscleGroup) => {
            onNewSettings(
              lf(settings)
                .p("muscleGroups")
                .modify((muscleGroups) => Muscle_restoreMuscleGroup(muscleGroups, muscleGroup))
            );
          }}
          settings={settings}
        />
      </div>
    </SheetScreenContainer>
  );
}
