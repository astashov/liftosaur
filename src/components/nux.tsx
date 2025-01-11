import { lb } from "lens-shmens";
import React, { JSX } from "react";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "../models/state";
import { IconCloseCircleOutline } from "./icons/iconCloseCircleOutline";
import { View, TouchableOpacity } from "react-native";
import { LftText } from "./lftText";

interface IProps {
  dispatch: IDispatch;
  id: string;
  helps: string[];
  className?: string;
  children: React.ReactNode;
}

export function Nux(props: IProps): JSX.Element | null {
  if (props.helps.indexOf(props.id) !== -1) {
    return null;
  }
  const { dispatch } = props;
  return (
    <View className={`${props.className} flex flex-row py-2 pl-4 text-xs bg-white rounded-2xl`}>
      <LftText>{props.children}</LftText>
      <View>
        <TouchableOpacity
          className="p-2 nm-nux-close"
          style={{ marginTop: -4 }}
          onPress={() => {
            updateState(dispatch, [
              lb<IState>()
                .p("storage")
                .p("helps")
                .recordModify((helps) => [...helps, props.id]),
            ]);
          }}
        >
          <IconCloseCircleOutline size={16} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
