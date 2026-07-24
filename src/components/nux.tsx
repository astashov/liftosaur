import { JSX, ReactNode } from "react";
import { View, Pressable } from "react-native";
import { lb } from "lens-shmens";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "../models/state";
import { IconClose2 } from "./icons/iconClose2";
import { IconHelp } from "./icons/iconHelp";
import { Tailwind_colors } from "../utils/tailwindConfig";

interface IProps {
  dispatch?: IDispatch;
  id: string;
  helps: string[];
  className?: string;
  children: ReactNode;
}

export function Nux(props: IProps): JSX.Element | null {
  if (props.helps.indexOf(props.id) !== -1) {
    return null;
  }
  const { dispatch } = props;
  return (
    <View
      className={`${props.className ?? ""} flex-row py-2 pl-2 bg-background-default border border-border-cardpurple rounded-2xl`}
    >
      <View className="flex-row items-start flex-1">
        <View className="mr-2">
          <IconHelp color={Tailwind_colors().purple[500]} size={16} />
        </View>
        <View className="flex-1">{props.children}</View>
      </View>
      {dispatch && (
        <View>
          <Pressable
            className="px-2 nm-nux-close"
            hitSlop={12}
            onPress={() => {
              updateState(
                dispatch,
                [
                  lb<IState>()
                    .p("storage")
                    .p("helps")
                    .recordModify((helps) => [...helps, props.id]),
                ],
                "Dismiss help tip"
              );
            }}
          >
            <IconClose2 size={12} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
