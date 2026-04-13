import { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { MenuItemEditable } from "./menuItemEditable";
import { IExercise, Exercise_onerm } from "../models/exercise";
import { IExerciseDataValue, ISettings } from "../types";
import { IconCalculator } from "./icons/iconCalculator";
import { useModal } from "../navigation/ModalStateContext";

interface IExerciseRMProps {
  name: string;
  rmKey: keyof IExerciseDataValue;
  exercise: IExercise;
  settings: ISettings;
  onEditVariable: (value: number) => void;
  onInput?: (v: string) => void;
}

export function ExerciseRM(props: IExerciseRMProps): JSX.Element {
  const rm = Exercise_onerm(props.exercise, props.settings);

  const openCalculator = useModal("repMaxCalculatorModal", (weightValue) => {
    if (weightValue != null) {
      props.onEditVariable(weightValue);
    }
  });

  return (
    <View
      data-cy="exercise-stats-1rm-set"
      testID="exercise-stats-1rm-set"
      className="px-4 py-1 mt-2 font-bold bg-background-cardpurple rounded-2xl"
    >
      <MenuItemEditable
        type="number"
        name={props.name}
        isBorderless={true}
        onChange={(v) => {
          const value = v ? parseFloat(v) : undefined;
          if (value && !isNaN(value)) {
            props.onEditVariable(value);
          }
        }}
        onInput={props.onInput}
        value={`${rm.value}`}
        after={
          <>
            <Text className="ml-1 mr-2 font-normal text-text-secondary">{rm.unit}</Text>
            <Pressable
              className="px-2"
              data-cy="onerm-calculator"
              testID="onerm-calculator"
              style={{ marginRight: -4 }}
              onPress={() => {
                openCalculator({ unit: props.settings.units });
              }}
            >
              <IconCalculator size={16} />
            </Pressable>
          </>
        }
      />
      <View>
        <Text className="text-xs italic font-normal text-right">
          Available in Liftoscript as <Text className="font-bold">{props.rmKey}</Text> variable
        </Text>
      </View>
    </View>
  );
}
