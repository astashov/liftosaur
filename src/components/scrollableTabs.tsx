import React, { JSX } from "react";
import { StringUtils } from "../utils/string";
import { useState } from "react";
import { Scroller } from "./scroller";
import { View, TouchableOpacity } from "react-native";
import { LftText } from "./lftText";

interface IProps {
  tabs: {
    label: string;
    children: React.ReactNode;
    isInvalid?: boolean;
  }[];
  defaultIndex?: number;
  offsetY?: string;
  onChange?: (index: number) => void;
}

export function ScrollableTabs(props: IProps): JSX.Element {
  const { tabs } = props;
  const [selectedIndex, setSelectedIndex] = useState<number>(props.defaultIndex || 0);

  return (
    <View className="flex-col h-full">
      {tabs.length > 1 && (
        <View className="flex-row" style={{ marginLeft: -16, marginRight: -16 }}>
          <Scroller arrowYOffsetPct={0}>
            <View className="flex-row w-full pt-4">
              {tabs.map(({ label, isInvalid }, index) => {
                const nameClass = `tab-${StringUtils.dashcase(label.toLowerCase())}`;

                return (
                  <View
                    className="flex-row justify-center flex-1 text-center whitespace-no-wrap border-b border-grayv2-50"
                    key={index}
                  >
                    <TouchableOpacity
                      className={`ls-${nameClass} justify-center text-base px-4 pb-1 border-b ${
                        selectedIndex === index ? "text-orangev2 border-orangev2" : "border-white"
                      } ${isInvalid ? " text-redv2-main" : ""} nm-tab-${nameClass}`}
                      style={{ borderBottomWidth: 2 }}
                      data-cy={nameClass}
                      onPress={() => {
                        if (props.onChange) {
                          props.onChange(index);
                        }
                        setSelectedIndex(index);
                      }}
                    >
                      <LftText className={`text-center ${isInvalid ? "text-redv2-main" : ""}`}>
                        {isInvalid ? " ⚠️" : ""}
                        {label}
                      </LftText>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </Scroller>
        </View>
      )}
      <View className="flex-1">{tabs[selectedIndex]?.children || tabs[0]?.children}</View>
    </View>
  );
}
