import { JSX, useState } from "react";
import { View, ScrollView } from "react-native";
import { Text } from "../../components/primitives/text";
import { useNavigation } from "@react-navigation/native";
import { Button } from "../../components/button";
import { ExercisePickerOptions, IFilterValue } from "../../components/exercisePicker/exercisePickerOptions";
import { exerciseKinds, IExerciseKind } from "../../types";
import { StringUtils_capitalize } from "../../utils/string";
import { ObjectUtils_keys, ObjectUtils_mapValues } from "../../utils/object";
import { useModalData, useModalDispatch, Modal_setResult, Modal_clear } from "../ModalStateContext";

export function NavModalExerciseTypesPicker(): JSX.Element {
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const data = useModalData("exerciseTypesPickerModal");
  const initialTypes = data?.selectedTypes ?? [];

  const [typeValues, setTypeValues] = useState<Record<IExerciseKind, IFilterValue>>(() =>
    exerciseKinds.reduce<Record<IExerciseKind, IFilterValue>>(
      (memo, type) => {
        memo[type] = {
          label: StringUtils_capitalize(type),
          isSelected: initialTypes.includes(type),
        };
        return memo;
      },
      {} as Record<IExerciseKind, IFilterValue>
    )
  );

  const onClose = (): void => {
    const selectedTypes = ObjectUtils_keys(typeValues).filter((k) => typeValues[k].isSelected);
    Modal_setResult(modalDispatch, "exerciseTypesPickerModal", selectedTypes);
    Modal_clear(modalDispatch, "exerciseTypesPickerModal");
    navigation.goBack();
  };

  if (!data) {
    return <></>;
  }

  return (
    <>
      <View collapsable={false} className="flex-row items-center px-4 my-6">
        <Text className="flex-1 text-base font-semibold leading-6 text-center">Types</Text>
        <View className="absolute right-4">
          <Button kind="purple" name="done-selecting-types" buttonSize="md" onPress={onClose}>
            Done
          </Button>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <ExercisePickerOptions
          values={typeValues}
          onSelect={(key) => {
            setTypeValues(
              ObjectUtils_mapValues(typeValues, (type: IFilterValue, k: IExerciseKind) => {
                if (k === key) {
                  return { ...type, isSelected: !type.isSelected };
                }
                return type;
              })
            );
          }}
        />
      </ScrollView>
    </>
  );
}
