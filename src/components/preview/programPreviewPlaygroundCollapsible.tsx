import { JSX, ReactNode, useCallback, useRef, useState } from "react";
import { View, ScrollView, Pressable, LayoutChangeEvent, useWindowDimensions } from "react-native";
import PagerView from "react-native-pager-view";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useAnimatedRef,
  scrollTo,
  useAnimatedReaction,
  type SharedValue,
} from "react-native-reanimated";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

const VISIBLE_TABS_HINT = 3.5;

interface ICollapsiblePreviewProps {
  headerContent: ReactNode;
  weekNames: string[];
  singleWeek: boolean;
  renderWeekContent: (weekIndex: number) => JSX.Element;
}

export function CollapsiblePreview(props: ICollapsiblePreviewProps): JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0);
  const [contentHeights, setContentHeights] = useState<Record<number, number>>({});
  const indexDecimal = useSharedValue(0);
  const pagerRef = useRef<PagerView>(null);
  const { height: windowHeight } = useWindowDimensions();

  const pagerHeight = contentHeights[activeIndex] ?? windowHeight;
  const semantic = Tailwind_semantic();

  const onPageLayout = useCallback((weekIndex: number, height: number) => {
    setContentHeights((prev) => {
      if (prev[weekIndex] === height) return prev;
      return { ...prev, [weekIndex]: height };
    });
  }, []);

  return (
    <ScrollView
      style={{ flex: 1 }}
      className="bg-background-default"
      stickyHeaderIndices={props.singleWeek ? undefined : [1]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View>{props.headerContent}</View>

      {!props.singleWeek && (
        <PagerTabBar
          tabNames={props.weekNames}
          indexDecimal={indexDecimal}
          activeColor={semantic.text.purple}
          inactiveColor={semantic.text.secondary}
          borderColor={semantic.border.neutral}
          onTabPress={(index) => {
            pagerRef.current?.setPage(index);
          }}
        />
      )}

      {props.singleWeek ? (
        <View>{props.renderWeekContent(0)}</View>
      ) : (
        <PagerView
          ref={pagerRef}
          style={{ height: pagerHeight }}
          initialPage={0}
          onPageScroll={(e) => {
            indexDecimal.value = e.nativeEvent.position + e.nativeEvent.offset;
          }}
          onPageSelected={(e) => {
            setActiveIndex(e.nativeEvent.position);
          }}
        >
          {props.weekNames.map((weekName, weekIndex) => (
            <View key={weekName} collapsable={false}>
              <View onLayout={(e: LayoutChangeEvent) => onPageLayout(weekIndex, e.nativeEvent.layout.height)}>
                {props.renderWeekContent(weekIndex)}
              </View>
            </View>
          ))}
        </PagerView>
      )}
    </ScrollView>
  );
}

interface IPagerTabBarProps {
  tabNames: string[];
  indexDecimal: SharedValue<number>;
  activeColor: string;
  inactiveColor: string;
  borderColor: string;
  onTabPress: (index: number) => void;
}

function PagerTabBar(props: IPagerTabBarProps): JSX.Element {
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
    <Pressable
      key={name}
      className="items-center py-3"
      style={fitsInScreen ? { flex: 1 } : { width: measuredTabWidth }}
      onPress={() => props.onTabPress(i)}
    >
      <PagerTabItemText
        name={name}
        index={i}
        indexDecimal={props.indexDecimal}
        activeColor={props.activeColor}
        inactiveColor={props.inactiveColor}
      />
    </Pressable>
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

function PagerTabItemText(props: {
  name: string;
  index: number;
  indexDecimal: SharedValue<number>;
  activeColor: string;
  inactiveColor: string;
}): JSX.Element {
  const textStyle = useAnimatedStyle(() => ({
    color: Math.abs(props.index - props.indexDecimal.value) < 0.5 ? props.activeColor : props.inactiveColor,
  }));
  return <Animated.Text style={[{ fontFamily: "Poppins", fontSize: 16 }, textStyle]}>{props.name}</Animated.Text>;
}
