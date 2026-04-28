import { JSX, ReactNode, useLayoutEffect } from "react";
import { View, ScrollView, Platform, useWindowDimensions } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { Text } from "../../components/primitives/text";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { ExercisePickerOptionsMuscles } from "../../components/exercisePicker/exercisePickerOptionsMuscles";
import { Button } from "../../components/button";
import { IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";
import { lf } from "lens-shmens";
import { Muscle_getMusclesFromScreenMuscle, Muscle_updateMuscleGroup } from "../../models/muscle";
import { CollectionUtils_remove } from "../../utils/collection";
import type { IRootStackParamList } from "../types";

const isWeb = Platform.OS === "web";
const SHEET_DETENT = 0.9;

export function NavModalMuscleGroupMusclePicker(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const { height: windowHeight } = useWindowDimensions();
  const headerHeight = useHeaderHeight();
  const route = useRoute<{
    key: string;
    name: "muscleGroupMusclePickerModal";
    params: IRootStackParamList["muscleGroupMusclePickerModal"];
  }>();
  const { muscleGroup } = route.params;
  const settings = state.storage.settings;
  const muscles = Muscle_getMusclesFromScreenMuscle(muscleGroup, settings);

  const onClose = (): void => {
    navigation.goBack();
  };

  useLayoutEffect(() => {
    if (isWeb) {
      return;
    }
    navigation.setOptions({
      unstable_headerRightItems: () => [
        {
          type: "custom",
          hidesSharedBackground: true,
          element: (
            <Button
              kind="purple"
              buttonSize="md"
              name="done-selecting-muscles"
              data-testid="done-selecting-muscles"
              testID="done-selecting-muscles"
              onClick={onClose}
            >
              Done
            </Button>
          ),
        },
      ],
    });
  }, [navigation]);

  const list = (
    <ExercisePickerOptionsMuscles
      dontGroup={true}
      settings={settings}
      selectedValues={muscles}
      onSelect={(muscle) => {
        const existingMuscles = Muscle_getMusclesFromScreenMuscle(muscleGroup, state.storage.settings);
        const newMuscles = existingMuscles.includes(muscle)
          ? CollectionUtils_remove(existingMuscles, muscle)
          : [...existingMuscles, muscle];
        updateState(
          dispatch,
          [
            lb<IState>()
              .p("storage")
              .p("settings")
              .p("muscleGroups")
              .record(
                lf(state.storage.settings)
                  .p("muscleGroups")
                  .modify((mg) => Muscle_updateMuscleGroup(mg, muscleGroup, newMuscles)).muscleGroups
              ),
          ],
          "Update muscle group muscles"
        );
      }}
    />
  );

  if (isWeb) {
    return (
      <WebSheet onClose={onClose}>
        <View className="px-4 py-2">
          <View className="flex-row items-center pt-2 pb-3">
            <Text className="flex-1 text-base font-semibold text-center">Choose Muscles</Text>
            <View className="absolute right-0">
              <Button
                kind="purple"
                buttonSize="md"
                name="done-selecting-muscles"
                data-testid="done-selecting-muscles"
                testID="done-selecting-muscles"
                onClick={onClose}
              >
                Done
              </Button>
            </View>
          </View>
          {list}
        </View>
      </WebSheet>
    );
  }

  const contentHeight = windowHeight * SHEET_DETENT - headerHeight;
  return (
    <View style={{ height: contentHeight }}>
      <ScrollView className="flex-1 pb-4">
        <View className="px-4 pt-2 pb-8">{list}</View>
      </ScrollView>
    </View>
  );
}

function WebSheet(props: { onClose: () => void; children: ReactNode }): JSX.Element {
  return (
    <SheetScreenContainer onClose={props.onClose} shouldShowClose={true}>
      {props.children}
    </SheetScreenContainer>
  );
}
