import { JSX, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { GroupHeader } from "../groupHeader";
import { Text } from "../primitives/text";
import { InputNumber2 } from "../inputNumber2";
import { IEquipmentSetup, IWeight } from "../../types";
import { IEquipmentLoadQuery } from "../../models/equipmentLoadSolver";
import {
  EquipmentTryWeight_exactChanged,
  EquipmentTryWeight_initialValue,
  EquipmentTryWeight_step,
  EquipmentTryWeight_view,
} from "../../models/equipmentTryWeight";
import { ExactLoadHaptic_play } from "../../utils/exactLoadHaptic";
import { EquipmentLoadPicture } from "../equipmentLoadPicture";

interface IProps {
  setup: IEquipmentSetup;
  errors: string[];
  bodyweight: IWeight;
}

export function EquipmentEditorTryWeight(props: IProps): JSX.Element {
  const query: IEquipmentLoadQuery = { bodyweight: props.bodyweight };
  const [value, setValue] = useState<number>(() => EquipmentTryWeight_initialValue(props.setup, props.errors, query));
  const view = EquipmentTryWeight_view(props.setup, props.errors, value, query);
  const isExact = view.kind === "load" && view.isExact;
  const wasExactRef = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    const change = EquipmentTryWeight_exactChanged(wasExactRef.current, isExact);
    if (change.shouldPlayHaptic) {
      ExactLoadHaptic_play();
    }
    wasExactRef.current = change.wasExact;
  }, [isExact]);
  if (view.kind === "error") {
    return (
      <View className="px-4 py-3 border-t border-border-neutral bg-background-default">
        <Text className="text-sm text-text-error" testID="equipment-error">
          {view.error}
        </Text>
      </View>
    );
  }
  const { result, picture } = view;
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
          onNext={(v) => EquipmentTryWeight_step(props.setup, v, 1, query)}
          onPrev={(v) => EquipmentTryWeight_step(props.setup, v, -1, query)}
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
