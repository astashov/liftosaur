import { JSX, ReactNode, useState } from "react";
import { View, ScrollView, Pressable, Platform, LayoutChangeEvent } from "react-native";
import { Text } from "./primitives/text";
import { StringUtils_dashcase } from "../utils/string";
import { Scroller } from "./scroller";
import { Tailwind_semantic } from "../utils/tailwindConfig";

export interface IScrollableTabsProps {
  tabs: {
    label: string;
    children: () => ReactNode;
    isInvalid?: boolean;
  }[];
  color?: "orange" | "purple";
  defaultIndex?: number;
  className?: string;
  type?: "tabs" | "squares";
  shouldNotExpand?: boolean;
  offsetY?: string;
  topPadding?: string;
  nonSticky?: boolean;
  zIndex?: number;
  fillHeight?: boolean;
  onChange?: (index: number) => void;
  headerContent?: ReactNode;
}

export function ScrollableTabs(props: IScrollableTabsProps): JSX.Element {
  const { tabs } = props;
  const [selectedIndex, setSelectedIndex] = useState<number>(props.defaultIndex || 0);
  const [barWidth, setBarWidth] = useState<number>(0);
  const color = props.color || "orange";

  const onBarLayout = (e: LayoutChangeEvent): void => {
    setBarWidth(e.nativeEvent.layout.width);
  };

  const tabsRow =
    tabs.length > 1 ? (
      <View
        className={`flex-row ${props.topPadding == null ? "pt-6" : ""} pb-2 ${props.className || ""}`}
        style={{
          ...(props.topPadding != null ? { paddingTop: parseFloat(props.topPadding) || 0 } : null),
          minWidth: barWidth || undefined,
        }}
      >
        {tabs.map(({ label, isInvalid }, index) => {
          const nameClass = `tab-${StringUtils_dashcase(label.toLowerCase())}`;

          if (props.type === "squares") {
            const isSelected = selectedIndex === index;
            return (
              <Pressable
                key={label}
                className={`px-3 py-2 rounded mr-2 ${
                  isSelected
                    ? "bg-background-default border border-button-primarybackground"
                    : "bg-background-subtle border border-background-default"
                }`}
                data-testid={nameClass}
                testID={nameClass}
                onPress={() => {
                  props.onChange?.(index);
                  setSelectedIndex(index);
                }}
              >
                <Text className={`text-sm ${isSelected ? "text-text-purple" : "text-text-secondary"}`}>{label}</Text>
              </Pressable>
            );
          }

          const isSelected = selectedIndex === index;
          const activeColor =
            color === "orange" ? Tailwind_semantic().icon.yellow : Tailwind_semantic().button.secondarystroke;
          const activeTextColor = color === "orange" ? "text-icon-yellow" : "text-text-purple";

          return (
            <View
              key={label}
              className="items-center border-b border-border-neutral"
              style={{ flexGrow: 1, flexShrink: 0, flexBasis: "auto" }}
            >
              <Pressable
                className="px-4 pb-1"
                style={isSelected ? { borderBottomWidth: 2, borderBottomColor: activeColor } : undefined}
                data-testid={nameClass}
                testID={nameClass}
                onPress={() => {
                  props.onChange?.(index);
                  setSelectedIndex(index);
                }}
              >
                <Text
                  numberOfLines={1}
                  className={`text-base ${isSelected ? activeTextColor : ""} ${isInvalid ? "text-text-error" : ""}`}
                >
                  {isInvalid ? "⚠️" : ""}
                  {label}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    ) : null;
  const tabBar =
    tabsRow != null ? (
      <View className="bg-background-default" onLayout={onBarLayout}>
        <Scroller>{tabsRow}</Scroller>
      </View>
    ) : null;

  const content = (
    <View className={props.fillHeight ? "flex-1" : ""}>{tabs[selectedIndex]?.children() || tabs[0]?.children()}</View>
  );

  if (props.headerContent != null) {
    return (
      <ScrollView
        stickyHeaderIndices={tabBar ? [1] : undefined}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        className="bg-background-default"
      >
        <View>{props.headerContent}</View>
        {tabBar || <View />}
        {content}
      </ScrollView>
    );
  }

  const stickyStyle =
    !props.nonSticky && Platform.OS === "web"
      ? ({ position: "sticky", top: props.offsetY || 0, zIndex: props.zIndex ?? 10 } as Record<string, unknown>)
      : undefined;

  return (
    <View className={props.fillHeight ? "flex-1" : ""}>
      {tabBar && (
        <View style={stickyStyle} className="bg-background-default">
          {tabBar}
        </View>
      )}
      {content}
    </View>
  );
}
