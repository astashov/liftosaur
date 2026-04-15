import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { ExerciseCloneLibraryContent } from "../../components/exercisePicker/bottomSheetExerciseCloneLibrary";
import { Exercise_targetMuscles, Exercise_synergistMuscles } from "../../models/exercise";
import { ExerciseImageUtils_url } from "../../models/exerciseImage";
import { ObjectUtils_clone } from "../../utils/object";
import { useModalDispatch, Modal_setResult, Modal_clear } from "../ModalStateContext";

export function NavModalExerciseCloneLibrary(): JSX.Element {
  const { state } = useAppState();
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const settings = state.storage.settings;

  const onClose = (): void => {
    Modal_clear(modalDispatch, "exerciseCloneLibraryModal");
    navigation.goBack();
  };

  return (
    <SheetScreenContainer onClose={onClose}>
      <ExerciseCloneLibraryContent
        showMuscles={true}
        settings={settings}
        onClose={onClose}
        onSelect={(exercise) => {
          const customExercise = settings.exercises[exercise.id];
          const smallImageUrl = customExercise
            ? customExercise.smallImageUrl
            : ExerciseImageUtils_url(exercise, "small");
          const largeImageUrl = customExercise
            ? customExercise.largeImageUrl
            : ExerciseImageUtils_url(exercise, "large");
          const targetMuscles = ObjectUtils_clone(Exercise_targetMuscles(exercise, settings));
          const synergistMuscles = ObjectUtils_clone(Exercise_synergistMuscles(exercise, settings));
          const types = ObjectUtils_clone(exercise.types);
          Modal_setResult(modalDispatch, "exerciseCloneLibraryModal", {
            smallImageUrl,
            largeImageUrl,
            targetMuscles,
            synergistMuscles,
            types,
          });
          Modal_clear(modalDispatch, "exerciseCloneLibraryModal");
          navigation.goBack();
        }}
      />
    </SheetScreenContainer>
  );
}
