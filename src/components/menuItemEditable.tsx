import React, { JSX } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { MenuItemWrapper } from "./menuItem";
import { useState, Dispatch } from "react";
import { StringUtils } from "../utils/string";
import { IconTrash } from "./icons/iconTrash";
import { lg } from "../utils/posthog";
import { LftText } from "./lftText";
import { LftCheckbox } from "./lftCheckbox";
import RNPickerSelect from "react-native-picker-select";

type IMenuItemType = "text" | "number" | "select" | "boolean";

interface IMenuItemEditableValueProps {
  name: string;
  prefix?: React.ReactNode;
  type: IMenuItemType;
  value: string | null | undefined;
  valueUnits?: string;
  values?: [string, string][];
  onChange?: (text?: string) => void;
  pattern?: string;
  patternMessage?: string;
}

interface IMenuItemEditableProps extends IMenuItemEditableValueProps {
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
  const [patternError, setPatternError] = useState<boolean>(false);
  let numberOfVisibleItems = Math.min(props.values?.length || 0, 4);
  if (numberOfVisibleItems % 2 === 0) {
    numberOfVisibleItems += 1;
  }
  const onChange = (e?: string): void => {
    lg(`menu-item-edit-${StringUtils.dashcase(props.name)}`);
    if (props.onChange != null) {
      props.onChange(e);
    }
  };
  return (
    <MenuItemWrapper name={props.name} isBorderless={props.isBorderless}>
      <View className="flex flex-col py-1 text-base">
        <View className="flex flex-row items-center">
          {props.prefix}
          <View>
            <View
              data-cy={`menu-item-name-${StringUtils.dashcase(props.name)}`}
              className={`flex flex-col min-w-0 break-all items-center pr-2 ${props.isNameBold ? "font-bold" : ""}`}
              {...(props.isNameHtml ? { dangerouslySetInnerHTML: { __html: props.name } } : {})}
            >
              <LftText>{props.isNameHtml ? "" : props.name}</LftText>
              {props.underName}
            </View>
          </View>
          <View className="flex-1" style={{ minWidth: 24 }}>
            <MenuItemValue
              name={props.name}
              type={props.type}
              value={props.value}
              pattern={props.pattern}
              patternMessage={props.patternMessage}
              values={props.values}
              setPatternError={setPatternError}
              onChange={onChange}
            />
          </View>
          {props.value != null && <LftText className="flex items-center text-grayv2-700">{props.valueUnits}</LftText>}
          {props.value != null && props.hasClear && (
            <TouchableOpacity
              data-cy={`menu-item-delete-${StringUtils.dashcase(props.name)}`}
              onPress={() => onChange(undefined)}
              style={{ marginRight: -8 }}
              className={`p-2 nm-menu-item-delete-${StringUtils.dashcase(props.name)}`}
            >
              <IconTrash />
            </TouchableOpacity>
          )}
          {props.after != null ? props.after : undefined}
        </View>
        {(props.errorMessage || (patternError && props.patternMessage)) && (
          <LftText style={{ marginTop: -8 }} className="text-xs text-right text-red-500">
            {props.errorMessage || props.patternMessage}
          </LftText>
        )}
      </View>
      {props.nextLine}
    </MenuItemWrapper>
  );
}

export function MenuItemValue(
  props: { setPatternError: Dispatch<boolean> } & IMenuItemEditableValueProps
): JSX.Element | null {
  if (props.type === "select") {
    return (
      <View className="flex-row items-center justify-end flex-1 text-right min-h-10">
        <RNPickerSelect
          value={props.value}
          onValueChange={(itemValue) => {
            if (props.onChange) {
              props.onChange(itemValue == null ? undefined : itemValue);
            }
          }}
          items={(props.values || []).map(([value, label]) => ({ label, value }))}
          style={{
            viewContainer: {
              alignItems: "center",
              justifyContent: "center",
            },
            inputWeb: {
              textAlign: "right",
            },
            inputIOSContainer: {
              alignItems: "flex-end",
              pointerEvents: "none",
            },
          }}
        />
      </View>
    );
  } else if (props.type === "text") {
    return (
      <TextInput
        data-cy={`menu-item-value-${StringUtils.dashcase(props.name)}`}
        key={props.value}
        className="flex-1 w-full py-2 text-right bg-transparent text-bluev2"
        value={props.value || undefined}
        onChangeText={props.onChange}
      />
    );
  } else if (props.type === "boolean") {
    return (
      <View className="flex-row items-center justify-end flex-1 text-right min-h-10">
        <LftCheckbox
          name={props.name}
          value={props.value === "true"}
          onChange={(e) => {
            if (props.onChange) {
              props.onChange(e ? "true" : "false");
            }
          }}
        />
      </View>
    );
  } else if (props.type === "number") {
    return (
      <View className="flex-row flex-1 text-right">
        <TextInput
          data-cy={`menu-item-value-${StringUtils.dashcase(props.name)}`}
          key={props.value}
          className="flex-1 w-full py-2 text-right bg-transparent text-bluev2"
          value={props.value || undefined}
          onChangeText={props.onChange}
          keyboardType="numeric"
        />
      </View>
    );
  } else {
    return null;
  }
}
