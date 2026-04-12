import { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../../components/primitives/text";
import { useNavigation } from "@react-navigation/native";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { useModalData, useModalDispatch, Modal_setResult, Modal_clear } from "../ModalStateContext";

export function NavModalInputSelect(): JSX.Element {
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const data = useModalData("inputSelectModal");

  const onClose = (): void => {
    Modal_clear(modalDispatch, "inputSelectModal");
    navigation.goBack();
  };

  if (!data) {
    return <></>;
  }

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      {data.hint && (
        <View className="pt-1 pl-2 pr-8">
          <Text className="text-xs text-text-secondary">{data.hint}</Text>
        </View>
      )}
      <View
        className="flex flex-col px-2 py-2"
        data-cy={data.name ? `select-options-${data.name}` : undefined}
        testID={data.name ? `select-options-${data.name}` : undefined}
      >
        {data.emptyLabel != null && (
          <Pressable
            data-cy="select-option-empty"
            testID="select-option-empty"
            className={`py-2 px-2 ${data.selectedValue == null ? "bg-background-subtle rounded" : ""}`}
            onPress={() => {
              Modal_setResult(modalDispatch, "inputSelectModal", "");
              Modal_clear(modalDispatch, "inputSelectModal");
              navigation.goBack();
            }}
          >
            <Text>{data.emptyLabel}</Text>
          </Pressable>
        )}
        {data.values.map(([key, label], i) => (
          <Pressable
            data-cy={`select-option-${key}`}
            testID={`select-option-${key}`}
            key={key}
            className={`py-2 px-2 ${key === data.selectedValue ? "bg-background-subtle rounded" : ""} ${
              i !== 0 && key !== data.selectedValue ? "border-t border-border-neutral" : ""
            }`}
            onPress={() => {
              Modal_setResult(modalDispatch, "inputSelectModal", key);
              Modal_clear(modalDispatch, "inputSelectModal");
              navigation.goBack();
            }}
          >
            <Text>{label}</Text>
          </Pressable>
        ))}
      </View>
    </SheetScreenContainer>
  );
}
