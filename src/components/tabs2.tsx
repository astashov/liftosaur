import { JSX, ReactNode, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { StringUtils_dashcase } from "../utils/string";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IProps {
  tabs: [string, ReactNode][];
  defaultIndex?: number;
  onChange?: (index: number, newValue: string) => void;
}

export function Tabs2(props: IProps): JSX.Element {
  const { tabs, onChange } = props;
  const [selectedIndex, setSelectedIndex] = useState<number>(props.defaultIndex || 0);
  return (
    <View>
      <View className="flex-row">
        {tabs.map(([name], index) => {
          const nameClass = `tab-${StringUtils_dashcase(name.toLowerCase())}`;

          return (
            <View key={name} className="flex-1 items-center border-b border-border-neutral">
              <Pressable
                className="px-4 pb-1"
                style={
                  selectedIndex === index
                    ? { borderBottomWidth: 2, borderBottomColor: Tailwind_semantic().icon.yellow }
                    : undefined
                }
                data-cy={nameClass} data-testid={nameClass}
                testID={nameClass}
                onPress={() => {
                  if (onChange) {
                    onChange(index, name);
                  }
                  setSelectedIndex(index);
                }}
              >
                <Text className={`text-base ${selectedIndex === index ? "text-icon-yellow" : ""}`}>{name}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      {tabs[selectedIndex][1]}
    </View>
  );
}
