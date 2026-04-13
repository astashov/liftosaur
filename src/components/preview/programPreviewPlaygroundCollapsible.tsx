import { JSX, ReactNode, useCallback, useState } from "react";
import { View, Pressable, LayoutChangeEvent } from "react-native";
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  scrollTo,
  useAnimatedRef,
  type SharedValue,
} from "react-native-reanimated";
import { Tabs } from "react-native-collapsible-tab-view";
import type { TabBarProps } from "react-native-collapsible-tab-view";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

// --- Custom tab bar ---

const VISIBLE_TABS_HINT = 3.5;

interface ICollapsibleTabBarProps {
  tabNames: string[];
  indexDecimal: SharedValue<number>;
  onTabPress: (name: string) => void;
  activeColor: string;
  inactiveColor: string;
  borderColor: string;
}

function CollapsibleTabBar(props: ICollapsibleTabBarProps): JSX.Element {
  const tabCount = props.tabNames.length;
  const fitsInScreen = tabCount <= 4;
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const containerWidth = useSharedValue(0);
  const tabItemWidth = useSharedValue(0);
  const [measuredTabWidth, setMeasuredTabWidth] = useState(0);

  const onContainerLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      containerWidth.value = w;
      const tw = fitsInScreen ? w / tabCount : w / VISIBLE_TABS_HINT;
      tabItemWidth.value = tw;
      setMeasuredTabWidth(tw);
    },
    [tabCount, fitsInScreen]
  );

  const indicatorStyle = useAnimatedStyle(() => ({
    width: tabItemWidth.value,
    transform: [{ translateX: props.indexDecimal.value * tabItemWidth.value }],
  }));

  useAnimatedReaction(
    () => Math.round(props.indexDecimal.value),
    (currentIndex, previousIndex) => {
      if (currentIndex !== previousIndex && !fitsInScreen) {
        const tw = tabItemWidth.value;
        const targetX = currentIndex * tw - (containerWidth.value / 2 - tw / 2);
        scrollTo(scrollRef, Math.max(0, targetX), 0, true);
      }
    }
  );

  const tabItems = props.tabNames.map((name, i) => (
    <CollapsibleTabItem
      key={name}
      name={name}
      index={i}
      indexDecimal={props.indexDecimal}
      onPress={() => props.onTabPress(name)}
      activeColor={props.activeColor}
      inactiveColor={props.inactiveColor}
      fixedWidth={fitsInScreen ? undefined : measuredTabWidth}
    />
  ));

  const indicator = (
    <Animated.View
      style={[{ position: "absolute", bottom: 0, height: 2, backgroundColor: props.activeColor }, indicatorStyle]}
    />
  );

  return (
    <View
      className="bg-background-default"
      style={{ borderBottomWidth: 1, borderBottomColor: props.borderColor }}
      onLayout={onContainerLayout}
    >
      {fitsInScreen ? (
        <View className="flex-row">
          {tabItems}
          {indicator}
        </View>
      ) : (
        <Animated.ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row">
            {tabItems}
            {indicator}
          </View>
        </Animated.ScrollView>
      )}
    </View>
  );
}

interface ICollapsibleTabItemProps {
  name: string;
  index: number;
  indexDecimal: SharedValue<number>;
  onPress: () => void;
  activeColor: string;
  inactiveColor: string;
  fixedWidth?: number;
}

function CollapsibleTabItem(props: ICollapsibleTabItemProps): JSX.Element {
  const textStyle = useAnimatedStyle(() => ({
    color: Math.abs(props.index - props.indexDecimal.value) < 0.5 ? props.activeColor : props.inactiveColor,
  }));

  return (
    <Pressable
      className="items-center py-3"
      style={props.fixedWidth ? { width: props.fixedWidth } : { flex: 1 }}
      onPress={props.onPress}
    >
      <Animated.Text style={[{ fontFamily: "Poppins", fontSize: 16 }, textStyle]}>{props.name}</Animated.Text>
    </Pressable>
  );
}

// --- Collapsible preview container ---

interface ICollapsiblePreviewProps {
  headerContent: ReactNode;
  weekNames: string[];
  singleWeek: boolean;
  renderWeekContent: (weekIndex: number) => JSX.Element;
}

export function CollapsiblePreview(props: ICollapsiblePreviewProps): JSX.Element {
  const [containerReady, setContainerReady] = useState(false);
  const purpleColor = Tailwind_semantic().text.purple;
  const inactiveColor = Tailwind_semantic().text.secondary;
  const borderColor = Tailwind_semantic().border.neutral;

  const renderHeader = useCallback(
    () => (
      <View className="bg-background-default" pointerEvents="box-none">
        {props.headerContent}
      </View>
    ),
    [props.headerContent]
  );

  const renderTabBar = useCallback(
    (tabBarProps: TabBarProps) =>
      props.singleWeek ? (
        <View />
      ) : (
        <CollapsibleTabBar
          tabNames={tabBarProps.tabNames}
          indexDecimal={tabBarProps.indexDecimal}
          onTabPress={tabBarProps.onTabPress}
          activeColor={purpleColor}
          inactiveColor={inactiveColor}
          borderColor={borderColor}
        />
      ),
    [purpleColor, inactiveColor, borderColor, props.singleWeek]
  );

  return (
    <View
      style={{ flex: 1 }}
      className="bg-background-default"
      onLayout={() => {
        if (!containerReady) {
          setContainerReady(true);
        }
      }}
    >
      {containerReady && (
        <Tabs.Container
          renderHeader={renderHeader}
          renderTabBar={renderTabBar}
          headerContainerStyle={{ shadowOpacity: 0, elevation: 0 }}
          allowHeaderOverscroll
          lazy={false}
          cancelLazyFadeIn
        >
          {props.weekNames.map((weekName, weekIndex) => (
            <Tabs.Tab key={weekName} name={weekName} label={weekName}>
              <Tabs.ScrollView
                style={{ backgroundColor: Tailwind_semantic().background.default }}
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                {props.renderWeekContent(weekIndex)}
              </Tabs.ScrollView>
            </Tabs.Tab>
          ))}
        </Tabs.Container>
      )}
    </View>
  );
}
