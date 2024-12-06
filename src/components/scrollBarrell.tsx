import { h, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { StringUtils } from "../utils/string";

interface IProps {
  isExpanded: boolean;
  values: [string, string][];
  defaultSelectedValue: string | null | undefined;
  numberOfVisibleItems: number;
  itemHeight: number;
  onSelect: (value: string) => void;
}

export function ScrollBarrell(props: IProps): JSX.Element {
  const height = props.itemHeight * props.numberOfVisibleItems;
  const numberOfDummyItems = Math.floor(props.numberOfVisibleItems / 2);
  const containerRef = useRef<HTMLDivElement>();
  const barrelRef = useRef<HTMLDivElement>();
  const timer = useRef<number | undefined>(undefined);
  const isDefaultSet = useRef<boolean>(false);
  const isTurnedOn = useRef<boolean>(props.isExpanded);
  const isExpanded = useRef<boolean>(props.isExpanded);
  isExpanded.current = props.isExpanded;

  function setDefaultIndex(): void {
    if (!isDefaultSet.current) {
      const barrel = barrelRef.current;
      if (barrel) {
        let defaultSelectedIndex = props.values.findIndex(([value, key]) => value === props.defaultSelectedValue);
        defaultSelectedIndex = defaultSelectedIndex === -1 ? 0 : defaultSelectedIndex;
        barrel.scrollTop = defaultSelectedIndex * props.itemHeight;
        isDefaultSet.current = true;
      }
    }
  }

  useEffect(() => {
    setDefaultIndex();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("transitionend", (e) => {
        isTurnedOn.current = isExpanded.current;
      });
    }
  }, []);

  useEffect(() => {
    const barrel = barrelRef.current;
    if (barrel) {
      barrel.addEventListener("scroll", (e) => {
        if (!isTurnedOn.current) {
          return;
        }
        const target = e.target as HTMLDivElement;
        if (timer.current) {
          clearTimeout(timer.current);
        }
        timer.current = window.setTimeout(() => {
          if (props.isExpanded) {
            timer.current = undefined;
            const offset = target.scrollTop;
            const index = Math.round(offset / props.itemHeight);
            const selected = props.values[index];
            if (selected != null) {
              const value = selected[0];
              props.onSelect(value);
            }
          }
        }, 150);
      });
    }
  }, [props.isExpanded, props.values, props.defaultSelectedValue, props.itemHeight]);

  return (
    <div
      className="relative overflow-hidden border-t border-grayv2-100"
      ref={containerRef}
      style={{
        transition: "height 150ms ease-in-out, visibility 150ms linear",
        visibility: props.isExpanded ? "inherit" : "hidden",
        height: props.isExpanded ? `${height}px` : 0,
      }}
    >
      <div
        className="absolute w-full scroll-barrell-selected bg-grayv2-100"
        style={{
          height: `${props.itemHeight}px`,
          top: "50%",
          left: 0,
          marginTop: `-${Math.round(props.itemHeight / 2)}px`,
        }}
      />
      <div
        className="relative w-full h-full overflow-scroll"
        ref={barrelRef}
        style={{ overflowScrolling: "touch", scrollSnapType: "y mandatory" }}
      >
        {Array.apply(null, Array(numberOfDummyItems)).map(() => (
          <div
            className="flex items-center justify-center w-full"
            style={{ minHeight: `${props.itemHeight}px`, scrollSnapAlign: "start" }}
          />
        ))}
        {props.values.map(([value, label], index) => (
          <button
            data-cy={`scroll-barrel-item-${StringUtils.dashcase(label)}`}
            className="flex items-center justify-center w-full cursor-pointer scroll-barrel-item"
            style={{ minHeight: `${props.itemHeight}px`, scrollSnapAlign: "start" }}
            onClick={() => {
              props.onSelect(value);
              barrelRef.current.scrollTo({ top: index * props.itemHeight, behavior: "smooth" });
            }}
          >
            {StringUtils.truncate(label, 35)}
          </button>
        ))}
        {Array.apply(null, Array(numberOfDummyItems)).map(() => (
          <div
            className="flex items-center justify-center w-full"
            style={{ minHeight: `${props.itemHeight}px`, scrollSnapAlign: "start" }}
          />
        ))}
      </div>
      <div
        className="absolute inset-0 pointer-events-none "
        style={{
          background: `linear-gradient(0deg, ${[
            "rgba(255,255,255,1) 0px",
            "rgba(255,255,255,1) 5%",
            "rgba(255,255,255,0) 30%",
            "rgba(255,255,255,0) 60%",
            "rgba(255,255,255,1) 95%",
            "rgba(255,255,255,1) 100%",
          ].join(",")})`,
        }}
      />
    </div>
  );
}
