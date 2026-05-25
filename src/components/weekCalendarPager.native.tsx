import { JSX, forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import { View, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { LegendList, LegendListRef } from "@legendapp/list";

export interface IWeekCalendarPagerHandle {
  scrollToIndex: (index: number, animated?: boolean) => void;
}

export interface IWeekCalendarPagerProps {
  data: number[];
  initialIndex: number;
  onPageChange: (index: number) => void;
  renderPage: (firstDayOfWeek: number) => JSX.Element;
}

export const WeekCalendarPager = forwardRef<IWeekCalendarPagerHandle, IWeekCalendarPagerProps>(
  function WeekCalendarPager(props, ref) {
    const { data, initialIndex, onPageChange, renderPage } = props;
    const flatListRef = useRef<LegendListRef>(null);
    const [pageWidth, setPageWidth] = useState(0);
    const pageWidthRef = useRef(0);
    pageWidthRef.current = pageWidth;
    const lastEmittedIndexRef = useRef<number>(initialIndex);
    const onPageChangeRef = useRef(onPageChange);
    onPageChangeRef.current = onPageChange;

    useImperativeHandle(
      ref,
      () => ({
        scrollToIndex: (index, animated = false) => {
          if (index < 0 || pageWidthRef.current <= 0 || !flatListRef.current) {
            return;
          }
          if (index === lastEmittedIndexRef.current) {
            return;
          }
          lastEmittedIndexRef.current = index;
          flatListRef.current.scrollToIndex({ index, animated });
        },
      }),
      []
    );

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      if (width > 0 && width !== pageWidthRef.current) {
        setPageWidth(width);
      }
    }, []);

    const snapToIndices = useMemo(() => data.map((_, i) => i), [data]);

    const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const width = pageWidthRef.current;
      if (width <= 0) {
        return;
      }
      const index = Math.round(event.nativeEvent.contentOffset.x / width);
      if (index !== lastEmittedIndexRef.current) {
        lastEmittedIndexRef.current = index;
        onPageChangeRef.current(index);
      }
    }, []);

    const renderItem = useCallback(
      ({ item }: { item: number }) => <View style={{ width: pageWidth }}>{renderPage(item)}</View>,
      [pageWidth, renderPage]
    );

    const keyExtractor = useCallback((item: number) => String(item), []);

    return (
      <View onLayout={handleLayout}>
        {pageWidth > 0 && (
          <LegendList
            ref={flatListRef}
            data={data}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            estimatedItemSize={pageWidth}
            snapToIndices={snapToIndices}
            initialScrollIndex={initialIndex >= 0 ? initialIndex : undefined}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
          />
        )}
      </View>
    );
  }
);
