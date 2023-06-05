import { h, JSX, ComponentChildren } from "preact";
import { StringUtils } from "../utils/string";
import { useRef, useState, useEffect } from "preact/hooks";

interface IProps {
  tabs: [string, ComponentChildren][];
  defaultIndex?: number;
}

export function ScrollableTabs(props: IProps): JSX.Element {
  const { tabs } = props;
  const tabsRef = useRef<HTMLDivElement>(null);
  const [atLeft, setAtLeft] = useState<boolean>(true);
  const [atRight, setAtRight] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(props.defaultIndex || 0);

  useEffect(() => {
    if (!tabsRef.current || tabsRef.current.clientWidth >= tabsRef.current.scrollWidth) {
      setAtLeft(true);
      setAtRight(true);
    } else {
      setAtLeft(tabsRef.current?.scrollLeft === 0);
      const diff = Math.abs(
        tabsRef.current?.scrollLeft - (tabsRef.current?.scrollWidth - tabsRef.current?.clientWidth)
      );
      setAtRight(diff < 3);
    }
  }, []);

  return (
    <div className="relative">
      {tabs.length > 1 && (
        <div className="sticky top-0 left-0 z-10 bg-white" style={{ marginLeft: "-1rem", marginRight: "-1rem" }}>
          {!atLeft && (
            <div
              className="absolute top-0 left-0 z-20 w-16 h-10"
              style={{ background: "linear-gradient(90deg, rgba(255,255,255,1) 40%, rgba(255,255,255,0) 100%)" }}
            >
              <button
                className="flex items-center justify-center h-full px-4 outline-none focus:outline-none"
                onClick={() => {
                  // eslint-disable-next-line no-unused-expressions
                  tabsRef.current?.scrollTo({ left: 0, behavior: "smooth" });
                }}
              >
                {"<"}
              </button>
            </div>
          )}
          {!atRight && (
            <div
              className="absolute top-0 right-0 z-20 w-16 h-10"
              style={{ background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 50%)" }}
            >
              <button
                className="flex items-center justify-center h-full px-4 ml-auto outline-none focus:outline-none"
                onClick={() => {
                  const newScrollRight = tabsRef.current?.scrollLeft + tabsRef.current?.clientWidth;
                  if (newScrollRight !== undefined) {
                    // eslint-disable-next-line no-unused-expressions
                    tabsRef.current?.scrollTo({ left: newScrollRight, behavior: "smooth" });
                  }
                }}
              >
                {">"}
              </button>
            </div>
          )}
          <div
            ref={tabsRef}
            className="flex px-2 pt-2 overflow-x-auto"
            onScroll={() => {
              setAtLeft(tabsRef.current?.scrollLeft === 0);
              const diff = Math.abs(
                tabsRef.current?.scrollLeft - (tabsRef.current?.scrollWidth - tabsRef.current?.clientWidth)
              );
              setAtRight(diff < 3);
            }}
          >
            {tabs.map(([name, content], index) => {
              const nameClass = `tab-${StringUtils.dashcase(name.toLowerCase())}`;

              return (
                <div className="flex-1 text-center whitespace-no-wrap border-b border-grayv2-50">
                  <button
                    className={`ls-${nameClass} inline-block text-base px-4 pb-1 outline-none focus:outline-none ${
                      selectedIndex === index ? "text-orangev2 border-b border-orangev2" : ""
                    }`}
                    style={selectedIndex === index ? { borderBottomWidth: "2px" } : {}}
                    data-cy={nameClass}
                    onClick={() => setSelectedIndex(index)}
                  >
                    {name}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {tabs[selectedIndex][1]}
    </div>
  );
}
