import { JSX, h, Fragment } from "preact";
import { useRef, useState, useEffect } from "preact/hooks";
import { HtmlUtils } from "../utils/html";

interface IData {
  point: number;
  index: number;
}

type IDraggableMode = "horizontal" | "vertical";

interface IDraggableListProps<T> {
  items: T[];
  hideBorders?: boolean;
  mode: IDraggableMode;
  isDisabled?: boolean;
  isTransparent?: boolean;
  element: (
    item: T,
    index: number,
    handleWrapper?: (touchEvent: TouchEvent | MouseEvent) => void,
    onClick?: (index: number) => void
  ) => JSX.Element;
  onClick?: (index: number) => void;
  delayMs?: number;
  onDragStart?: (startIndex: number) => void;
  onDragEnd: (startIndex: number, endIndex: number) => void;
}

export function DraggableList<T>(props: IDraggableListProps<T>): JSX.Element {
  const [data, setData] = useState<IData | undefined>(undefined);
  const theData = useRef<IData | undefined>(undefined);
  const elWrapper = useRef<HTMLDivElement>();
  const offsetX = useRef<number | undefined>(undefined);
  const offsetY = useRef<number | undefined>(undefined);
  const widths = useRef<(number | undefined)[]>([]);
  const heights = useRef<(number | undefined)[]>([]);

  useEffect(() => {
    offsetX.current = elWrapper.current!.offsetLeft;
    offsetY.current = elWrapper.current!.offsetTop;
  }, []);

  return (
    <div
      className={`relative flex items-center ${props.mode === "horizontal" ? "flex-row" : "flex-col"}`}
      ref={elWrapper}
    >
      {props.items.map((e, i) => (
        <Fragment>
          <DropTarget
            mode={props.mode}
            index={i}
            widths={widths.current}
            heights={heights.current}
            data={theData.current}
          />
          <DraggableListItem
            onClick={props.onClick}
            delayMs={props.delayMs}
            isDisabled={props.isDisabled}
            hideBorders={props.hideBorders}
            isTransparent={props.isTransparent}
            mode={props.mode}
            isDragging={!!theData.current}
            element={props.element}
            onSizeCalc={(wdth, hght) => {
              widths.current[i] = wdth;
              heights.current[i] = hght;
            }}
            item={e}
            index={i}
            onStart={(point) => {
              const newData = {
                point,
                index: i,
              };
              setData(newData);
              theData.current = newData;
              if (props.onDragStart) {
                props.onDragStart(i);
              }
            }}
            onMove={(point) => {
              const newData = {
                point,
                index: i,
              };
              setData(newData);
              theData.current = newData;
            }}
            onEnd={() => {
              const d = theData.current;
              if (d == null) {
                props.onDragEnd(i, i);
                setData(undefined);
                theData.current = undefined;
                return;
              }
              const startIndex = d.index;
              const point = d.point; //  - offsetY.current!;
              const sizes = props.mode === "horizontal" ? widths : heights;
              let endIndex = 0;
              let currentSize = 0;
              let nextSize = sizes.current[endIndex]!;
              while (nextSize > 0 && currentSize < point - nextSize && nextSize != null) {
                currentSize += nextSize;
                endIndex += 1;
                nextSize = sizes.current[endIndex]!;
              }
              props.onDragEnd(startIndex, endIndex);
              setData(undefined);
              theData.current = undefined;
            }}
          />
          {props.items.length - 1 === i && (
            <DropTarget mode={props.mode} widths={widths.current} heights={heights.current} index={i + 1} data={data} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

function DropTarget({
  data,
  mode,
  index,
  widths,
  heights,
}: {
  data?: IData;
  mode: IDraggableMode;
  index: number;
  widths: (number | undefined)[];
  heights: (number | undefined)[];
}): JSX.Element {
  const el = useRef<HTMLDivElement>();
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

  const pt = mode === "horizontal" ? rect.current?.x : rect.current?.y;
  const sizes = mode === "horizontal" ? widths : heights;
  let isVisible;
  if (pt != null && data != null && index !== data.index) {
    if (index < data.index) {
      isVisible = data.point > pt && data.point < pt + sizes[index]!;
    } else {
      isVisible =
        data.point > (index <= 1 ? -9999 : pt - sizes[data.index]!) &&
        data.point < pt - sizes[data.index]! + (sizes[index]! ?? 9999);
    }
  }

  return (
    <div
      ref={el}
      style={{
        height: isVisible ? `${(data && heights[data?.index]) || 0}px` : 0,
        width: isVisible ? `${(data && widths[data?.index]) || 0}px` : 0,
        transition: data != null ? "width 200ms ease-in-out, height 200ms ease-in-out" : "",
      }}
      data-id="drop-target"
    />
  );
}

interface IDraggableListItemProps<T> {
  hideBorders?: boolean;
  delayMs?: number;
  onClick?: (index: number) => void;
  isDisabled?: boolean;
  isTransparent?: boolean;
  isDragging: boolean;
  mode: IDraggableMode;
  onStart: (point: number) => void;
  onMove: (point: number) => void;
  onEnd: () => void;
  onSizeCalc: (width?: number, height?: number) => void;
  currentHeight?: number;
  element: (
    item: T,
    index: number,
    handleWrapper?: (touchEvent: TouchEvent | MouseEvent) => void,
    onClick?: (index: number) => void
  ) => JSX.Element;
  item: T;
  index: number;
}

function DraggableListItem<T>(props: IDraggableListItemProps<T>): JSX.Element {
  function handleTouchStart(es: TouchEvent | MouseEvent): void {
    es.preventDefault();
    heightRef.current = el.current!.clientHeight;
    function handleTouchMove(em: TouchEvent | MouseEvent): void {
      em.preventDefault();

      if (!statusRef.current && Date.now() - startTime.current! > (props.delayMs ?? 0)) {
        shiftXRef.current = HtmlUtils.getPointX(em) + window.pageXOffset - el.current!.offsetLeft;
        shiftYRef.current = HtmlUtils.getPointY(em) + window.pageYOffset - el.current!.offsetTop;
        setIsDragging(true);
        statusRef.current = "start";
        const point =
          props.mode === "horizontal"
            ? HtmlUtils.getPointX(em) + window.pageXOffset - shiftXRef.current
            : HtmlUtils.getPointY(em) + window.pageYOffset - shiftYRef.current;
        props.onStart(point + Math.round((props.mode === "horizontal" ? widthRef.current! : heightRef.current!) / 2));
        setPoint(point);
      } else if (statusRef.current) {
        statusRef.current = "move";
        const p =
          props.mode === "horizontal"
            ? HtmlUtils.getPointX(em) + window.pageXOffset - (shiftXRef.current ?? 0)
            : HtmlUtils.getPointY(em) + window.pageYOffset - (shiftYRef.current ?? 0);
        setPoint(p);
        props.onMove(p + Math.round((props.mode === "horizontal" ? widthRef.current! : heightRef.current!) / 2));
      }
    }
    function handleTouchEnd(): void {
      setPoint(undefined);
      setIsDragging(false);
      statusRef.current = undefined;
      if (Date.now() - startTime.current! < (props.delayMs ?? 0)) {
        if (props.onClick) {
          props.onClick(props.index);
        }
      } else {
        props.onEnd();
      }
      window.document.removeEventListener("touchmove", handleTouchMove);
      window.document.removeEventListener("mousemove", handleTouchMove);
      window.document.removeEventListener("touchend", handleTouchEnd);
      window.document.removeEventListener("mouseup", handleTouchEnd);
    }

    window.document.removeEventListener("touchmove", handleTouchMove);
    window.document.removeEventListener("mousemove", handleTouchMove);
    window.document.removeEventListener("touchend", handleTouchEnd);
    window.document.removeEventListener("mouseup", handleTouchEnd);
    startTime.current = Date.now();

    setTimeout(() => {
      window.document.addEventListener("touchmove", handleTouchMove);
      window.document.addEventListener("mousemove", handleTouchMove);
      window.document.addEventListener("touchend", handleTouchEnd);
      window.document.addEventListener("mouseup", handleTouchEnd);
    }, 0);
  }

  const el = useRef<HTMLDivElement>();
  const [point, setPoint] = useState<number | undefined>(undefined);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [, setWidth] = useState<number | undefined>(undefined);
  const [, setHeight] = useState<number | undefined>(undefined);
  const widthRef = useRef<number | undefined>(undefined);
  const heightRef = useRef<number | undefined>(undefined);
  const statusRef = useRef<"start" | "move" | undefined>(undefined);
  const startTime = useRef<number | undefined>(undefined);
  const shiftXRef = useRef<number | undefined>(undefined);
  const shiftYRef = useRef<number | undefined>(undefined);

  const prevIsDragging = useRef<boolean>(false);

  useEffect(() => {
    if (!prevIsDragging.current && props.isDragging) {
      setWidth(el.current!.clientWidth);
      setHeight(el.current!.clientHeight);
      widthRef.current = el.current!.clientWidth;
      heightRef.current = el.current!.clientHeight;
      props.onSizeCalc(el.current!.clientWidth, el.current!.clientHeight);
    } else if (prevIsDragging.current && !props.isDragging) {
      setWidth(undefined);
      setHeight(undefined);
      widthRef.current = undefined;
      heightRef.current = undefined;
      props.onSizeCalc(undefined, undefined);
      setIsDragging(false);
    }
    prevIsDragging.current = props.isDragging;
  });

  let className = "";
  let style = {};
  if (point != null) {
    className = `${className} absolute w-full ${props.isTransparent ? "" : "bg-white"}}`;
    style = {
      top: 0,
      transform: props.mode === "horizontal" ? `translateX(${point}px)` : `translateY(${point}px)`,
      zIndex: 100,
      left: 0,
      borderWidth: props.hideBorders ? "0" : "1px 0",
      touchAction: "none",
      position: "absolute",
      ...(props.mode === "horizontal" ? { height: "100%" } : { width: "100%" }),
      background: !props.isTransparent ? "white" : undefined,
    };
  }

  return (
    <div
      data-id="draggable-list-item"
      ref={el}
      style={{
        ...(props.mode === "vertical"
          ? { height: statusRef.current === "move" ? 0 : (heightRef.current ?? "auto"), width: "100%" }
          : {}),
        ...(props.mode === "horizontal"
          ? { width: statusRef.current === "move" ? 0 : (widthRef.current ?? "auto"), height: "100%" }
          : {}),
        transition: isDragging ? "width 200ms ease-in-out, height 200ms ease-in-out" : "",
      }}
    >
      <div style={{ opacity: point != null ? 0 : 1 }}>
        {props.element(
          props.item,
          props.index,
          !props.isDisabled ? handleTouchStart : undefined,
          props.isDisabled ? props.onClick : undefined
        )}
      </div>
      {point != null && (
        <div style={style}>
          {props.element(
            props.item,
            props.index,
            !props.isDisabled ? handleTouchStart : undefined,
            props.isDisabled ? props.onClick : undefined
          )}
        </div>
      )}
    </div>
  );
}
