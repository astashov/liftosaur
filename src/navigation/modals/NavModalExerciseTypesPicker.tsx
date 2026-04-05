import { JSX, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { SheetScreenContainer } from "../SheetScreenContainer";
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
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <div className="flex flex-col h-full px-4" style={{ marginTop: "-0.75rem" }}>
        <h3 className="pt-6 pb-3 text-base font-semibold text-center">Types</h3>
        <div className="flex-1 overflow-y-auto">
          <div className="pb-4">
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
          </div>
        </div>
        <div className="py-2 bg-background-default">
          <Button kind="purple" name="done-selecting-types" className="w-full" buttonSize="md" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </SheetScreenContainer>
  );
}
