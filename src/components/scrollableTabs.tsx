import { h, JSX, ComponentChildren } from "preact";
import { StringUtils } from "../utils/string";
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
          className={`${props.nonSticky ? "" : "sticky"} left-0 z-10 bg-white`}
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
                const nameClass = `tab-${StringUtils.dashcase(label.toLowerCase())}`;

                const containerClassName =
                  props.type === "squares" ? "" : `flex-1 text-center border-b whitespace-nowrap border-grayv2-50`;
                const selectedWeekButtonStyles =
                  "bg-white border border-purplev3-main text-purplev3-main selected-tab-button";
                const unselectedWeekButtonStyles = "bg-grayv3-100 border border-white text-grayv3-main";
                const buttonClassName =
                  props.type === "squares"
                    ? `whitespace-nowrap px-3 py-2 text-sm rounded ${selectedIndex === index ? selectedWeekButtonStyles : unselectedWeekButtonStyles}`
                    : `ls-${nameClass} inline-block text-base px-4 pb-1 outline-none focus:outline-none ${
                        selectedIndex === index
                          ? color === "orange"
                            ? "text-orangev2 border-b border-orangev2 selected-tab-button"
                            : "text-purplev3-main border-b border-purplev3-main selected-tab-button"
                          : ""
                      } ${isInvalid ? " text-redv2-main" : ""} nm-tab-${nameClass}`;

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
