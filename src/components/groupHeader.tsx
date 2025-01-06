import { useState } from "react";
import { StringUtils } from "../utils/string";
import { IconArrowDown2 } from "./icons/iconArrowDown2";
import { IconArrowUp } from "./icons/iconArrowUp";
import { IconHelp } from "./icons/iconHelp";
import { TouchableOpacity, View } from "react-native";
import { LftText } from "./lftText";

interface IProps {
  name: string;
  help?: JSX.Element;
  size?: "small" | "large";
  children?: React.ReactNode;
  rightAddOn?: JSX.Element;
  leftExpandIcon?: boolean;
  isExpanded?: boolean;
  topPadding?: boolean;
  highlighted?: boolean;
}

export function GroupHeader(props: IProps): JSX.Element {
  const { name } = props;
  const [isExpanded, setIsExpanded] = useState<boolean>(!!props.isExpanded);
  const [isHelpShown, setIsHelpShown] = useState<boolean>(false);
  const size = props.size || "small";
  const testId = `group-header-${StringUtils.dashcase(name)}`;

  return (
    <>
      <TouchableOpacity onPress={props.children ? () => setIsExpanded(!isExpanded) : undefined}>
        <View
          data-cy={testId}
          className={`flex flex-row items-center pb-1 text-sm text-grayv2-700 ${
            props.children ? "cursor-pointer" : ""
          } ${props.topPadding ? "mt-6 pt-4" : ""}`}
        >
          {props.children && props.leftExpandIcon && (
            <View className="flex flex-row items-center justify-center mr-2 text-left">
              {isExpanded ? <IconArrowUp /> : <IconArrowDown2 />}
            </View>
          )}
          <View className="flex-1">
            <LftText
              className={`${size === "small" ? "text-xs" : "text-base font-bold"} ${
                props.highlighted ? "text-purplev2-main" : "text-grayv2-700"
              } align-middle`}
            >
              {name}
            </LftText>
          </View>
          <View className="flex flex-row items-center justify-center text-right">
            {props.rightAddOn}
            {props.help && (
              <TouchableOpacity onPress={() => setIsHelpShown(!isHelpShown)}>
                <View style={{ marginRight: -8 }} className="px-2 nm-group-header-help">
                  <IconHelp size={20} color="#607284" />
                </View>
              </TouchableOpacity>
            )}
            {props.children && !props.leftExpandIcon ? isExpanded ? <IconArrowUp /> : <IconArrowDown2 /> : null}
          </View>
        </View>
      </TouchableOpacity>
      {isHelpShown && props.help}
      {isExpanded && props.children}
    </>
  );
}
