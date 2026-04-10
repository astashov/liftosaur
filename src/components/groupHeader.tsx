import { JSX, Fragment, ReactNode, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { StringUtils_dashcase } from "../utils/string";
import { IconArrowDown2 } from "./icons/iconArrowDown2";
import { IconArrowUp } from "./icons/iconArrowUp";
import { IconHelp } from "./icons/iconHelp";

interface IProps {
  name: string;
  help?: JSX.Element;
  size?: "small" | "large";
  children?: ReactNode;
  headerClassName?: string;
  nameAddOn?: JSX.Element;
  rightAddOn?: JSX.Element;
  leftExpandIcon?: boolean;
  isExpanded?: boolean;
  expandOnIconClick?: boolean;
  topPadding?: boolean;
  highlighted?: boolean;
}

export function GroupHeader(props: IProps): JSX.Element {
  const { name } = props;
  const [isExpanded, setIsExpanded] = useState<boolean>(!!props.isExpanded);
  const [isHelpShown, setIsHelpShown] = useState<boolean>(false);
  const size = props.size || "small";
  const testId = `group-header-${StringUtils_dashcase(name)}`;

  function onClick(): void {
    if (props.children) {
      setIsExpanded(!isExpanded);
    }
  }

  return (
    <Fragment>
      <Pressable
        testID={testId}
        data-cy={testId}
        onPress={!props.expandOnIconClick ? onClick : undefined}
        className={`flex-row items-center pb-1 ${props.topPadding ? "mt-6 pt-4" : ""} ${props.headerClassName || ""}`}
      >
        {props.children && props.leftExpandIcon && (
          <Pressable
            className="flex items-center justify-center mr-2"
            onPress={props.expandOnIconClick ? onClick : undefined}
          >
            {isExpanded ? <IconArrowUp /> : <IconArrowDown2 />}
          </Pressable>
        )}
        <View className="flex-row items-center flex-1">
          <Text
            className={`${size === "small" ? "text-xs" : "text-base font-bold"} ${
              props.highlighted ? "text-text-purple" : "text-text-secondary"
            }`}
          >
            {name}
          </Text>
          {props.nameAddOn}
        </View>
        <View className="flex-row items-center justify-center">
          {props.rightAddOn}
          {props.help && (
            <Pressable style={{ marginRight: -8 }} className="px-2" onPress={() => setIsHelpShown(!isHelpShown)}>
              <IconHelp size={20} color="#607284" />
            </Pressable>
          )}
          {props.children && !props.leftExpandIcon ? isExpanded ? <IconArrowUp /> : <IconArrowDown2 /> : null}
        </View>
      </Pressable>
      {isHelpShown && props.help}
      {isExpanded && props.children}
    </Fragment>
  );
}
