import { h, JSX, ComponentChildren } from "preact";
import { StringUtils_dashcase } from "../utils/string";
import { useEffect, useRef, useState } from "preact/hooks";
import { Scroller } from "./scroller";

export interface IScrollableTabsProps {
  tabs: {
    label: string;
    children: () => ComponentChildren;
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
  onChange?: (index: number) => void;
}

export function ScrollableTabs(props: IScrollableTabsProps): JSX.Element {
  const { tabs } = props;
  const [selectedIndex, setSelectedIndex] = useState<number>(props.defaultIndex || 0);
  const color = props.color || "orange";
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabsRef.current) {
      const tabElement = tabsRef.current.querySelector(".selected-tab-button") as HTMLButtonElement | null;
      if (tabElement && tabElement.offsetLeft + tabElement.clientWidth > window.innerWidth) {
        tabElement.scrollIntoView({ behavior: "instant", block: "nearest", inline: "start" });
      }
    }
  }, []);

  return (
    <div className="relative">
      {tabs.length > 1 && (
        <div
          className={`${props.nonSticky ? "" : "sticky"} left-0 z-10 bg-background-default`}
          style={{
            top: props.offsetY || "0",
            marginLeft: props.shouldNotExpand ? undefined : "-1rem",
            marginRight: props.shouldNotExpand ? undefined : "-1rem",
          }}
        >
          <Scroller arrowYOffsetPct={0}>
            <div
              className={`flex w-full ${props.topPadding == null ? "pt-6" : ""} pb-2 ${props.className}`}
              style={{ paddingTop: props.topPadding }}
              ref={tabsRef}
            >
              {tabs.map(({ label, isInvalid }, index) => {
                const nameClass = `tab-${StringUtils_dashcase(label.toLowerCase())}`;

                const containerClassName =
                  props.type === "squares" ? "" : `flex-1 text-center border-b whitespace-nowrap border-border-neutral`;
                const selectedWeekButtonStyles =
                  "bg-background-default border border-button-primarybackground text-text-purple selected-tab-button";
                const unselectedWeekButtonStyles =
                  "bg-background-subtle border border-background-default text-text-secondary";
                const buttonClassName =
                  props.type === "squares"
                    ? `whitespace-nowrap px-3 py-2 text-sm rounded ${selectedIndex === index ? selectedWeekButtonStyles : unselectedWeekButtonStyles}`
                    : `ls-${nameClass} inline-block text-base px-4 pb-1 outline-none focus:outline-none ${
                        selectedIndex === index
                          ? color === "orange"
                            ? "text-icon-yellow border-b border-icon-yellow selected-tab-button"
                            : "text-text-purple border-b border-button-secondarystroke selected-tab-button"
                          : ""
                      } ${isInvalid ? " text-text-error" : ""} nm-tab-${nameClass}`;

                return (
                  <div className={containerClassName}>
                    <button
                      className={buttonClassName}
                      style={selectedIndex === index && props.type !== "squares" ? { borderBottomWidth: "2px" } : {}}
                      data-cy={nameClass}
                      onClick={() => {
                        if (props.onChange) {
                          props.onChange(index);
                        }
                        setSelectedIndex(index);
                      }}
                    >
                      {isInvalid ? " ⚠️" : ""}
                      {label}
                    </button>
                  </div>
                );
              })}
            </div>
          </Scroller>
        </div>
      )}
      {tabs[selectedIndex]?.children() || tabs[0]?.children()}
    </div>
  );
}
