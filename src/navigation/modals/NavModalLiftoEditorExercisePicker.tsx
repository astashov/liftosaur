import { JSX, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { TransparentModal } from "../TransparentModal";
import { ExercisePickerContent } from "../../components/exercisePicker/bottomSheetExercisePicker";
import { useModalData, useModalDispatch, Modal_setResult, Modal_clear } from "../ModalStateContext";
import { Program_getExerciseTypesForWeekDay } from "../../models/program";
import { Settings_toggleStarredExercise, Settings_changePickerSettings } from "../../models/settings";
import { Exercise_eq, Exercise_handleCustomExerciseChange } from "../../models/exercise";
import type { ICustomExercise, IExercisePickerSelectedExercise, IExercisePickerState } from "../../types";
import type { IExercisePickerSettings } from "../../components/exercisePicker/exercisePickerSettings";
import type { ILensDispatch } from "../../utils/useLensReducer";

// Exercise picker for the Liftoscript editor sheet: unlike the edit-program picker it has
// no planner edit state — the picker UI state is local, and the selection is handed back
// to the sheet via the modal result channel (the sheet rewrites the name token itself).
export function NavModalLiftoEditorExercisePicker(): JSX.Element {
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const data = useModalData("liftoEditorExercisePickerModal");
  const { state, dispatch } = useAppState();
  const settings = state.storage.settings;

  const [pickerState, setPickerState] = useState<IExercisePickerState>(() => ({
    mode: "program",
    screenStack: ["exercisePicker"],
    sort: data?.exerciseType ? (settings.workoutSettings.pickerSort ?? "name_asc") : "name_asc",
    filters: {},
    label: data?.label,
    templateName: data?.templateName,
    exerciseType: data?.exerciseType,
    selectedTab: 0,
    // The sheet only swaps the name token, so labels/templates are edited in the text itself.
    hideLabel: true,
    hideTemplate: true,
    selectedExercises: data?.exerciseType
      ? [{ type: "adhoc", exerciseType: data.exerciseType, label: data.label }]
      : [],
  }));

  const pickerDispatch: ILensDispatch<IExercisePickerState> = useCallback((recordings) => {
    const all = Array.isArray(recordings) ? recordings : [recordings];
    setPickerState((prev) => all.reduce((memo, recording) => recording.fn(memo), prev));
  }, []);

  const evaluatedProgram = data?.evaluatedProgram;
  const excludeUsedExerciseTypes = data?.excludeUsedExerciseTypes;
  const usedExerciseTypes = useMemo(() => {
    const used =
      evaluatedProgram != null && data?.dayData != null
        ? Program_getExerciseTypesForWeekDay(evaluatedProgram, data.dayData.week, data.dayData.dayInWeek)
        : [];
    return used.filter((et) => !(excludeUsedExerciseTypes ?? []).some((excluded) => Exercise_eq(et, excluded)));
  }, [evaluatedProgram, data?.dayData, excludeUsedExerciseTypes]);

  const onClose = useCallback((): void => {
    Modal_clear(modalDispatch, "liftoEditorExercisePickerModal");
    navigation.goBack();
  }, [modalDispatch, navigation]);

  const onChoose = useCallback(
    (selectedExercises: IExercisePickerSelectedExercise[]): void => {
      const selected = selectedExercises[0];
      if (selected != null) {
        Modal_setResult(modalDispatch, "liftoEditorExercisePickerModal", selected);
      }
      onClose();
    },
    [modalDispatch, onClose]
  );

  const onChangeCustomExercise = useCallback(
    (action: "upsert" | "delete", exercise: ICustomExercise, notes?: string) => {
      Exercise_handleCustomExerciseChange(dispatch, action, exercise, notes, settings);
    },
    [dispatch, settings]
  );
  const onStar = useCallback((key: string) => Settings_toggleStarredExercise(dispatch, key), [dispatch]);
  const onChangeSettings = useCallback(
    (pickerSettings: IExercisePickerSettings) => Settings_changePickerSettings(dispatch, pickerSettings),
    [dispatch]
  );

  const shouldGoBack = data == null;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack) {
    return <></>;
  }

  return (
    <SheetScreenContainer onClose={onClose}>
      <TransparentModal onClose={onClose}>
        <ExercisePickerContent
          settings={settings}
          isLoggedIn={!!state.user?.id}
          exercisePicker={pickerState}
          usedExerciseTypes={usedExerciseTypes}
          evaluatedProgram={evaluatedProgram}
          dispatch={pickerDispatch}
          onChoose={onChoose}
          onChangeCustomExercise={onChangeCustomExercise}
          onStar={onStar}
          onChangeSettings={onChangeSettings}
          onClose={onClose}
        />
      </TransparentModal>
    </SheetScreenContainer>
  );
}
