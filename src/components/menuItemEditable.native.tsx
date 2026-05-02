import { JSX, Dispatch, ReactNode, SetStateAction, useRef, useEffect, RefObject } from "react";
import { View, Pressable, TextInput } from "react-native";
import { Text } from "./primitives/text";
import { Switch } from "./primitives/switch";
import { MenuItemWrapper } from "./menuItem";
import { IconTrash } from "./icons/iconTrash";
import { StringUtils_dashcase } from "../utils/string";
import { ActionSheet_show } from "../utils/actionSheet";

type IMenuItemType = "text" | "number" | "select" | "boolean" | "desktop-select" | "select2";

interface IMenuItemEditableValueProps {
  name: string;
  prefix?: ReactNode;
  type: IMenuItemType;
  value: string | null | undefined;
  valueUnits?: string;
  values?: [string, string][];
  onChange?: (v?: string) => void;
  onInput?: (v: string) => void;
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
  const inputRef = useRef<TextInput>(null);
  const isTextInput = props.type === "text" || props.type === "number";

  return (
    <MenuItemWrapper name={props.name} isBorderless={props.isBorderless}>
      <Pressable
        className="flex-row items-center py-2"
        onPress={() => {
          if (isTextInput) {
            inputRef.current?.focus();
          }
        }}
      >
        {props.prefix}
        <View className="flex-1 pr-2">
          <Text
            className={`${props.size === "sm" ? "text-sm" : "text-base"} ${
              props.isNameBold ? "font-bold" : ""
            } text-text-primary`}
          >
            {props.name}
          </Text>
          {props.underName}
        </View>
        <View className="items-end">
          <MenuItemValue
            name={props.name}
            maxLength={props.maxLength}
            type={props.type}
            value={props.value}
            values={props.values}
            setPatternError={() => undefined}
            onChange={props.onChange}
            onInput={props.onInput}
            inputRef={isTextInput ? inputRef : undefined}
          />
        </View>
        {props.value != null && props.valueUnits && (
          <Text className="ml-1 text-text-secondary">{props.valueUnits}</Text>
        )}
        {props.value != null && props.hasClear && (
          <Pressable
            className="p-2"
            testID={`menu-item-delete-${StringUtils_dashcase(props.name)}`}
            data-testid={`menu-item-delete-${StringUtils_dashcase(props.name)}`}
            onPress={() => props.onChange?.(undefined)}
          >
            <IconTrash />
          </Pressable>
        )}
        {props.after}
      </Pressable>
      {props.errorMessage && <Text className="text-xs text-right text-red-500">{props.errorMessage}</Text>}
      {props.nextLine}
    </MenuItemWrapper>
  );
}

export function MenuItemValue(
  props: {
    setPatternError: Dispatch<SetStateAction<boolean>>;
    inputRef?: RefObject<TextInput | null>;
    onInput?: (v: string) => void;
  } & IMenuItemEditableValueProps
): JSX.Element | null {
  if (props.type === "desktop-select" || props.type === "select" || props.type === "select2") {
    const currentLabel = (props.values || []).find(([k]) => k === props.value)?.[1] ?? "";

    const showPicker = (): void => {
      const options = (props.values || []).map(([, label]) => label).concat("Cancel");
      ActionSheet_show({ options, cancelButtonIndex: options.length - 1 }, (buttonIndex) => {
        if (buttonIndex != null && buttonIndex < (props.values || []).length) {
          const selected = (props.values || [])[buttonIndex];
          if (selected && props.onChange) {
            props.onChange(selected[0]);
          }
        }
      });
    };

    return (
      <Pressable onPress={showPicker} className="px-2 py-1 border rounded border-border-neutral bg-background-default">
        <Text className="text-text-primary">{currentLabel || "Select..."}</Text>
      </Pressable>
    );
  }

  if (props.type === "boolean") {
    return <Switch value={props.value === "true"} onValueChange={(v) => props.onChange?.(v ? "true" : "false")} />;
  }

  if (props.type === "text" || props.type === "number") {
    return (
      <NativeTextValue
        value={props.value}
        onChange={props.onChange}
        onInput={props.onInput}
        keyboardType={props.type === "number" ? "numeric" : "default"}
        maxLength={props.maxLength}
        inputRef={props.inputRef}
      />
    );
  }

  return null;
}

function NativeTextValue(props: {
  value: string | null | undefined;
  onChange?: (v?: string) => void;
  onInput?: (v: string) => void;
  keyboardType: "numeric" | "default";
  maxLength?: number;
  inputRef?: RefObject<TextInput | null>;
}): JSX.Element {
  const localRef = useRef<TextInput>(null);
  const ref = props.inputRef ?? localRef;
  const currentValueRef = useRef(props.value ?? "");

  useEffect(() => {
    const newStr = props.value ?? "";
    if (currentValueRef.current !== newStr) {
      currentValueRef.current = newStr;
      ref.current?.setNativeProps({ text: newStr });
    }
  }, [props.value]);

  return (
    <TextInput
      ref={ref}
      className="py-2 text-base text-right text-text-link"
      style={{ minWidth: 80, fontFamily: "Poppins" }}
      defaultValue={currentValueRef.current}
      onChangeText={(text) => {
        currentValueRef.current = text;
        props.onInput?.(text);
      }}
      onBlur={() => props.onChange?.(currentValueRef.current)}
      keyboardType={props.keyboardType}
      maxLength={props.maxLength}
      selectTextOnFocus
    />
  );
}
