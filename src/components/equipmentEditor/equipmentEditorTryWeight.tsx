import { JSX, useState } from "react";
import { View } from "react-native";
import { GroupHeader } from "../groupHeader";
import { Text } from "../primitives/text";
import { InputNumber2 } from "../inputNumber2";
import { IEquipmentSetup, IWeight } from "../../types";
import {
  EquipmentLoadSolver_next,
  EquipmentLoadSolver_previous,
  EquipmentLoadSolver_select,
  IEquipmentLoadQuery,
} from "../../models/equipmentLoadSolver";
import { EquipmentLoadText_picture, EquipmentLoadText_tryResult } from "../../models/equipmentLoadText";
import { EquipmentLoadPicture } from "../equipmentLoadPicture";

interface IProps {
  setup: IEquipmentSetup;
  errors: string[];
  bodyweight: IWeight;
}

export function EquipmentEditorTryWeight(props: IProps): JSX.Element {
  const [value, setValue] = useState<number>(props.setup.unit === "lb" ? 135 : 60);
  if (props.errors.length > 0) {
    return (
      <View className="px-4 py-3 border-t border-border-neutral bg-background-default">
        <Text className="text-sm text-text-error" testID="equipment-error">
          {props.errors[0]}
        </Text>
      </View>
    );
  }
  const query: IEquipmentLoadQuery = { bodyweight: props.bodyweight };
  const target: IWeight = { value, unit: props.setup.unit };
  const load = EquipmentLoadSolver_select(props.setup, target, query);
  const result = EquipmentLoadText_tryResult(props.setup, load, target);
  const picture = EquipmentLoadText_picture(load, props.setup);
  return (
    <View className="px-4 py-3 border-t border-border-neutral bg-background-default">
      <GroupHeader name="Try a weight" />
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <InputNumber2
          name="equipment-try-weight"
          testID="equipment-try-weight"
          width={5}
          size="lg"
          allowDot={true}
          allowNegative={true}
          value={value}
          onNext={(v) => EquipmentLoadSolver_next(props.setup, { value: v ?? 0, unit: props.setup.unit }, query).value}
          onPrev={(v) =>
            EquipmentLoadSolver_previous(props.setup, { value: v ?? 0, unit: props.setup.unit }, query).value
          }
          onPreview={(v) => {
            if (v != null) {
              setValue(v);
            }
          }}
          onBlur={(v) => {
            if (v != null) {
              setValue(v);
            }
          }}
        />
        <View className="flex-1">
          {picture != null ? (
            <EquipmentLoadPicture picture={picture} size="lg" testID="equipment-try-result" />
          ) : (
            <Text className="text-base font-bold" testID="equipment-try-result">
              {result.main}
            </Text>
          )}
          {result.handle != null && <Text className="text-xs text-text-secondary">{result.handle}</Text>}
          {result.status === "exact" && <Text className="text-xs font-semibold text-text-success">Exact</Text>}
          {result.difference != null && <Text className="text-xs text-text-cardyellow">{result.difference}</Text>}
        </View>
      </View>
    </View>
  );
}
