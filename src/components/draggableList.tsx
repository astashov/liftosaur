import React, { JSX } from "react";
import { useRef, useState, useEffect } from "react";

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
  const elWrapper = useRef<HTMLDivElement>(null);
  const offsetY = useRef<number | undefined>(undefined);
  const heights = useRef<(number | undefined)[]>([]);

  useEffect(() => {
    offsetY.current = elWrapper.current!.offsetTop;
  }, []);

  return (
    <div className="relative" ref={elWrapper}>
      {props.items.map((e, i) => (
        <>
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
        </>
      ))}
    </div>
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
  const el = useRef<HTMLDivElement>(null);
  const rect = useRef<{ y: number; x: number; width: number; height: number } | undefined>(undefined);

  const prevIsDragging = useRef(false);
  useEffect(() => {
    const e = el.current!;
    if (!prevIsDragging.current && !!data) {
      rect.current = {
        x: e.offsetLeft,
        y: e.offsetTop,
        width: e.clientWidth,
        height: e.clientHeight,
      };
    } else if (prevIsDragging.current && !data) {
      rect.current = undefined;
    }
    prevIsDragging.current = !!data;
  });

  const y = rect.current!.y;
  let isVisible;
  if (y != null && data != null && index !== data.index) {
    if (index < data.index) {
      isVisible = data.pointY > y && data.pointY < y + heights[index]!;
    } else {
      isVisible = data.pointY > y - heights[data.index]! && data.pointY < y - heights[data.index]! + heights[index]!;
    }
  }

  return (
    <div
      ref={el}
      style={{
        height: isVisible ? `${(data && heights[data?.index]) || 0}px` : 0,
        transition: data != null ? "height 200ms ease-in-out" : "",
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

function getPointY(event: TouchEvent | MouseEvent): number {
  if ("touches" in event) {
    return event.touches[0].clientY;
  } else {
    return event.clientY;
  }
}

function DraggableListItem<T>(props: IDraggableListItemProps<T>): JSX.Element {
  function handleTouchStart(es: TouchEvent | MouseEvent): void {
    es.preventDefault();
    heightRef.current = el.current!.clientHeight;
    function handleTouchMove(em: TouchEvent | MouseEvent): void {
      em.preventDefault();
      const pointY = getPointY(em) + window.pageYOffset - shiftY;
      setY(pointY);
      props.onMove(pointY + Math.round(heightRef.current! / 2));
      if (statusRef.current !== "move") {
        window.document.addEventListener("touchend", handleTouchEnd);
        window.document.addEventListener("mouseup", handleTouchEnd);
      }
      statusRef.current = "move";
    }
    function handleTouchEnd(): void {
      setY(undefined);
      props.onEnd();
      setIsDragging(false);
      statusRef.current = undefined;
      window.document.removeEventListener("touchmove", handleTouchMove);
      window.document.removeEventListener("mousemove", handleTouchMove);
      window.document.removeEventListener("touchend", handleTouchEnd);
      window.document.removeEventListener("mouseup", handleTouchEnd);
    }

    window.document.removeEventListener("touchmove", handleTouchMove);
    window.document.removeEventListener("mousemove", handleTouchMove);
    window.document.removeEventListener("touchend", handleTouchEnd);
    window.document.removeEventListener("mouseup", handleTouchEnd);
    const elOffset = el.current!.offsetTop;
    const shiftY = getPointY(es) + window.pageYOffset - elOffset;
    setIsDragging(true);
    statusRef.current = "start";

    setTimeout(() => {
      const pointY = getPointY(es) + window.pageYOffset - shiftY;
      props.onStart(pointY + Math.round(heightRef.current! / 2));
      setY(pointY);
      window.document.addEventListener("touchmove", handleTouchMove);
      window.document.addEventListener("mousemove", handleTouchMove);
    }, 0);
  }

  const el = useRef<HTMLDivElement>(null);
  const [y, setY] = useState<number | undefined>(undefined);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [, setHeight] = useState<number | undefined>(undefined);
  const heightRef = useRef<number | undefined>(undefined);
  const statusRef = useRef<"start" | "move" | undefined>(undefined);

  const prevIsDragging = useRef<boolean>(false);

  useEffect(() => {
    if (!prevIsDragging.current && props.isDragging) {
      setHeight(el.current!.clientHeight);
      heightRef.current = el.current!.clientHeight;
      props.onHeightCalc(el.current!.clientHeight);
    } else if (prevIsDragging.current && !props.isDragging) {
      setHeight(undefined);
      heightRef.current = undefined;
      props.onHeightCalc(undefined);
      setIsDragging(false);
    }
    prevIsDragging.current = props.isDragging;
  });

  let className = "";
  let style = {};
  if (y != null) {
    className = `${className} absolute w-full ${props.isTransparent ? "" : "bg-white"}}`;
    style = {
      top: 0,
      transform: `translateY(${y}px)`,
      zIndex: 100,
      left: 0,
      borderWidth: props.hideBorders ? "0" : "1px 0",
      touchAction: "none",
      position: "absolute",
      width: "100%",
      background: !props.isTransparent ? "white" : undefined,
    };
  }

  return (
    <div
      data-id="draggable-list-item"
      ref={el}
      style={{
        height: statusRef.current === "move" ? 0 : heightRef.current ?? "auto",
        transition: isDragging ? "height 200ms ease-in-out" : "",
      }}
    >
      <div style={{ opacity: y != null ? 0 : 1 }}>{props.element(props.item, props.index, handleTouchStart)}</div>
      {y != null && <div style={style}>{props.element(props.item, props.index, handleTouchStart)}</div>}
    </div>
  );
}
