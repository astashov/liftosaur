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
    <View className="relative">
      {tabs.length > 1 && (
        <View
          className="sticky left-0 z-10 bg-white"
          style={{ top: props.offsetY ? parseFloat(props.offsetY) * 16 : 0, marginLeft: -16, marginRight: -16 }}
        >
          <Scroller arrowYOffsetPct={0}>
            <View className="flex-row w-full pt-24 pb-8">
              {tabs.map(({ label, isInvalid }, index) => {
                const nameClass = `tab-${StringUtils.dashcase(label.toLowerCase())}`;

                return (
                  <View className="flex-1 text-center whitespace-no-wrap border-b border-grayv2-50" key={index}>
                    <TouchableOpacity
                      className={`ls-${nameClass} inline-block text-base px-4 pb-1 outline-none focus:outline-none ${
                        selectedIndex === index ? "text-orangev2 border-b border-orangev2" : ""
                      } ${isInvalid ? " text-redv2-main" : ""} nm-tab-${nameClass}`}
                      style={selectedIndex === index ? { borderBottomWidth: 2 } : {}}
                      data-cy={nameClass}
                      onPress={() => {
                        if (props.onChange) {
                          props.onChange(index);
                        }
                        setSelectedIndex(index);
                      }}
                    >
                      <LftText className={`${isInvalid ? "text-redv2-main" : ""}`}>
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
      {tabs[selectedIndex]?.children || tabs[0]?.children}
    </View>
  );
}
