import { JSX, useState } from "react";
import { ActionSheetIOS, Platform } from "react-native";
import { Text } from "./primitives/text";
import { ObjectUtils_keys } from "../utils/object";
import { useIsModalAvailable, useModal } from "../navigation/ModalStateContext";
import { DropdownMenu, DropdownMenuItem } from "./dropdownMenu";

interface ISelectLinkProps<T extends string | number> {
  values: Record<T, string>;
  name: string;
  onChange: (value?: T) => void;
  className?: string;
  emptyLabel?: string;
  value?: T;
}

export function SelectLink<T extends string | number>(props: ISelectLinkProps<T>): JSX.Element {
  const selectedOption = props.value ? props.values[props.value] : undefined;
  const keys = ObjectUtils_keys(props.values);
  const hasModal = useIsModalAvailable();
  const [showOptions, setShowOptions] = useState(false);

  const openModal = useModal("inputSelectModal", (value) => {
    props.onChange(value === "" ? undefined : (value as T));
  });

  const onPress = (): void => {
    if (Platform.OS === "ios") {
      const labels: string[] = [];
      const keyMap: (T | undefined)[] = [];
      if (props.emptyLabel != null) {
        labels.push(props.emptyLabel);
        keyMap.push(undefined);
      }
      for (const key of keys) {
        labels.push(props.values[key]);
        keyMap.push(key);
      }
      labels.push("Cancel");
      ActionSheetIOS.showActionSheetWithOptions(
        { options: labels, cancelButtonIndex: labels.length - 1 },
        (buttonIndex) => {
          if (buttonIndex < keyMap.length) {
            props.onChange(keyMap[buttonIndex]);
          }
        }
      );
    } else if (!hasModal) {
      setShowOptions((s) => !s);
    } else {
      const values: [string, string][] = keys.map((key) => [String(key), props.values[key]]);
      openModal({
        name: props.name,
        values,
        selectedValue: props.value != null ? String(props.value) : undefined,
        emptyLabel: props.emptyLabel,
      });
    }
  };

  const label = (
    <Text
      onPress={onPress}
      data-testid={props.name}
      testID={props.name}
      className={`text-text-purple ${props.className || ""}`}
      style={{ textDecorationLine: "underline", textDecorationStyle: "dotted" }}
    >
      {selectedOption ?? props.emptyLabel}
    </Text>
  );

  if (hasModal) {
    return label;
  }

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {label}
      {showOptions && (
        <DropdownMenu
          leftOffset="0"
          topOffset="calc(100% + 8px)"
          maxWidth="16rem"
          bgColor="white"
          tipClassName="add-tip-up"
          textAlign="left"
          onClose={() => setShowOptions(false)}
        >
          {props.emptyLabel != null && (
            <DropdownMenuItem
              isTop={true}
              className={`text-left hover:bg-background-subtle ${props.value == null ? "font-bold text-text-purple" : ""}`}
              onClick={() => {
                props.onChange(undefined);
                setShowOptions(false);
              }}
            >
              {props.emptyLabel}
            </DropdownMenuItem>
          )}
          {keys.map((key, i) => {
            const value = props.values[key];
            return (
              <DropdownMenuItem
                key={key}
                isTop={i === 0 && props.emptyLabel == null}
                className={`text-left hover:bg-background-subtle ${props.value === key ? "font-bold text-text-purple" : ""}`}
                onClick={() => {
                  props.onChange(key);
                  setShowOptions(false);
                }}
              >
                {value}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenu>
      )}
    </span>
  );
}
