import { JSX, Dispatch, ReactNode, SetStateAction } from "react";
import { Pressable, ActionSheetIOS } from "react-native";
import { Text } from "./primitives/text";

type IMenuItemType = "text" | "number" | "select" | "boolean" | "desktop-select" | "select2";

interface IMenuItemEditableValueProps {
  name: string;
  prefix?: ReactNode;
  type: IMenuItemType;
  value: string | null | undefined;
  valueUnits?: string;
  values?: [string, string][];
  onChange?: (v?: string) => void;
  pattern?: string;
  patternMessage?: string;
  maxLength?: number;
}

interface IMenuItemEditableProps extends IMenuItemEditableValueProps {
  size?: "sm" | "base";
  isNameBold?: boolean;
  hasClear?: boolean;
  after?: JSX.Element;
  underName?: JSX.Element;
  nextLine?: JSX.Element;
  isNameHtml?: boolean;
  errorMessage?: string;
  isBorderless?: boolean;
}

export function MenuItemEditable(props: IMenuItemEditableProps): JSX.Element {
  return (
    <MenuItemValue
      name={props.name}
      type={props.type}
      value={props.value}
      values={props.values}
      onChange={props.onChange}
      setPatternError={() => undefined}
    />
  );
}

export function MenuItemValue(
  props: { setPatternError: Dispatch<SetStateAction<boolean>> } & IMenuItemEditableValueProps
): JSX.Element | null {
  if (props.type === "desktop-select") {
    const currentLabel = (props.values || []).find(([k]) => k === props.value)?.[1] ?? "";

    const showPicker = (): void => {
      const options = (props.values || []).map(([, label]) => label).concat("Cancel");
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: options.length - 1 }, (buttonIndex) => {
        if (buttonIndex < (props.values || []).length) {
          const selected = (props.values || [])[buttonIndex];
          if (selected && props.onChange) {
            props.onChange(selected[0]);
          }
        }
      });
    };

    return (
      <Pressable onPress={showPicker} className="border rounded border-border-neutral bg-background-default px-2 py-1">
        <Text className="text-text-primary">{currentLabel || "Select..."}</Text>
      </Pressable>
    );
  }

  return null;
}
