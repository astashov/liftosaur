import { useRef, useState } from "react";
import { View } from "react-native";

interface IData {
  pointY: number;
  index: number;
}

interface IDraggableListProps<T> {
  items: T[];
  hideBorders?: boolean;
  isTransparent?: boolean;
  element: (item: T, index: number, handleWrapper: (touchEvent: TouchEvent | MouseEvent) => void) => JSX.Element;
  onDragEnd: (startIndex: number, endIndex: number) => void;
}

export function DraggableList<T>(props: IDraggableListProps<T>): JSX.Element {
  const [data, setData] = useState<IData | undefined>(undefined);
  const theData = useRef<IData | undefined>(undefined);
  const elWrapper = useRef<View>(null);
  const heights = useRef<(number | undefined)[]>([]);

  return (
    <View className="relative" ref={elWrapper}>
      {props.items.map((e, i) => (
        <View key={i}>
          <DropTarget index={i} heights={heights.current} data={theData.current} />
          <DraggableListItem
            hideBorders={props.hideBorders}
            isTransparent={props.isTransparent}
            isDragging={!!theData.current}
            element={props.element}
            onHeightCalc={(hght) => (heights.current[i] = hght)}
            item={e}
            index={i}
            onStart={(pointY) => {
              const newData = {
                pointY,
                index: i,
              };
              setData(newData);
              theData.current = newData;
            }}
            onMove={(pointY) => {
              const newData = {
                pointY,
                index: i,
              };
              setData(newData);
              theData.current = newData;
            }}
            onEnd={() => {
              const d = theData.current!;
              const startIndex = d.index;
              const pointY = d.pointY; //  - offsetY.current!;
              let endIndex = 0;
              let currentHeight = 0;
              let nextHeight = heights.current[endIndex]!;
              while (nextHeight > 0 && currentHeight < pointY - nextHeight && nextHeight != null) {
                currentHeight += nextHeight;
                endIndex += 1;
                nextHeight = heights.current[endIndex]!;
              }
              props.onDragEnd(startIndex, endIndex);
              setData(undefined);
              theData.current = undefined;
            }}
          />
          {props.items.length - 1 === i && <DropTarget heights={heights.current} index={i + 1} data={data} />}
        </View>
      ))}
    </View>
  );
}

function DropTarget({
  data,
  index,
  heights,
}: {
  data?: IData;
  index: number;
  heights: (number | undefined)[];
}): JSX.Element {
  const el = useRef<View>(null);
  const rect = useRef<{ y: number; x: number; width: number; height: number } | undefined>(undefined);

  const y = rect.current?.y;
  let isVisible;
  if (y != null && data != null && index !== data.index) {
    if (index < data.index) {
      isVisible = data.pointY > y && data.pointY < y + heights[index]!;
    } else {
      isVisible = data.pointY > y - heights[data.index]! && data.pointY < y - heights[data.index]! + heights[index]!;
    }
  }

  return (
    <View
      ref={el}
      style={{
        height: isVisible ? (data && heights[data?.index]) || 0 : 0,
      }}
      data-id="drop-target"
    />
  );
}

interface IDraggableListItemProps<T> {
  hideBorders?: boolean;
  isTransparent?: boolean;
  isDragging: boolean;
  onStart: (pointY: number) => void;
  onMove: (pointY: number) => void;
  onEnd: () => void;
  onHeightCalc: (height?: number) => void;
  currentHeight?: number;
  element: (item: T, index: number, handleWrapper: (touchEvent: TouchEvent | MouseEvent) => void) => JSX.Element;
  item: T;
  index: number;
}

function DraggableListItem<T>(props: IDraggableListItemProps<T>): JSX.Element {
  const el = useRef<View>(null);
  const heightRef = useRef<number | undefined>(undefined);
  const statusRef = useRef<"start" | "move" | undefined>(undefined);

  return (
    <View
      data-id="draggable-list-item"
      ref={el}
      style={{
        height: statusRef.current === "move" ? 0 : heightRef.current ?? "auto",
      }}
    >
      <View style={{ opacity: 1 }}>{props.element(props.item, props.index, () => undefined)}</View>
    </View>
  );
}
