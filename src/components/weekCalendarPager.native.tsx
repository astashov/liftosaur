import { JSX, forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { View, FlatList, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";

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
    const flatListRef = useRef<FlatList<number>>(null);
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

    const getItemLayout = useCallback(
      (_data: ArrayLike<number> | null | undefined, index: number) => ({
        length: pageWidth,
        offset: pageWidth * index,
        index,
      }),
      [pageWidth]
    );

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
      <View className="flex-1" onLayout={handleLayout}>
        {pageWidth > 0 && (
          <FlatList
            ref={flatListRef}
            data={data}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            getItemLayout={getItemLayout}
            initialScrollIndex={initialIndex >= 0 ? initialIndex : undefined}
            initialNumToRender={2}
            windowSize={3}
            maxToRenderPerBatch={3}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
            onScrollToIndexFailed={() => {}}
          />
        )}
      </View>
    );
  }
);
