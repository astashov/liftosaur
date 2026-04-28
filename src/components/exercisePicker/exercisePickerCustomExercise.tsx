import { JSX, useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Text } from "../primitives/text";
import { ISettings, ICustomExercise, IExercisePickerScreen } from "../../types";
import { Button } from "../button";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconBack } from "../icons/iconBack";
import { IconClose2 } from "../icons/iconClose2";
import { ObjectUtils_isEqual } from "../../utils/object";
import { ExercisePickerCustomExerciseContent } from "./exercisePickerCustomExerciseContent";
import { Exercise_getNotes } from "../../models/exercise";
import { SheetDragHandle } from "../../navigation/SheetScreenContainer";

interface IExercisePickerCustomExercise2Props {
  settings: ISettings;
  screenStack: IExercisePickerScreen[];
  useInlineModals?: boolean;
  originalExercise?: ICustomExercise;
  showMuscles: boolean;
  exercise: ICustomExercise;
  isLoggedIn: boolean;
  dispatch: ILensDispatch<ICustomExercise>;
  onGoBack: (string: string) => void;
  onClose: () => void;
  onChange: (action: "upsert" | "delete", exercise: ICustomExercise, notes?: string) => void;
}

export function ExercisePickerCustomExercise(props: IExercisePickerCustomExercise2Props): JSX.Element {
  const isEdited = !props.originalExercise || !ObjectUtils_isEqual(props.exercise, props.originalExercise);
  const isValid = props.exercise.name.trim().length ?? 0 > 0;
  const [notes, setNotes] = useState<string | undefined>(
    props.exercise ? Exercise_getNotes(props.exercise, props.settings) : undefined
  );

  return (
    <View className="flex-1" style={{ marginTop: -12 }}>
      <SheetDragHandle>
        <View className="flex-row items-center pt-0 pb-4 mt-2">
          <Pressable
            className="px-4 py-2"
            hitSlop={12}
            data-testid="navbar-back"
            testID="navbar-back"
            onPress={() => {
              props.onGoBack("Pop screen in exercise picker screen stack");
            }}
          >
            {props.screenStack.length > 1 ? <IconBack /> : <IconClose2 size={22} />}
          </Pressable>
          <View className="flex-1" />
          <View className="px-4">
            <Button
              kind="purple"
              buttonSize="md"
              disabled={!isEdited || !isValid}
              name="navbar-save-custom-exercise"
              data-testid="custom-exercise-create"
              testID="custom-exercise-create"
              onPress={() => {
                props.onChange("upsert", props.exercise, notes);
                props.onGoBack("Save custom exercise");
              }}
            >
              Save
            </Button>
          </View>
          <View className="absolute top-0 left-0 right-0 items-center py-2" pointerEvents="none">
            <Text className="font-semibold">{props.exercise ? "Edit" : "Create"} Custom Exercise</Text>
          </View>
        </View>
      </SheetDragHandle>
      <ScrollView className="flex-1 pb-4">
        <View className="px-4">
          <ExercisePickerCustomExerciseContent
            onGoBack={props.onGoBack}
            settings={props.settings}
            useInlineModals={props.useInlineModals}
            hideNotes={false}
            hideDeleteButton={false}
            notes={notes}
            setNotes={setNotes}
            originalExercise={props.originalExercise}
            showMuscles={props.showMuscles}
            exercise={props.exercise}
            isLoggedIn={props.isLoggedIn}
            dispatch={props.dispatch}
            onClose={props.onClose}
            onDelete={() => {
              props.onChange("delete", props.exercise);
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}
