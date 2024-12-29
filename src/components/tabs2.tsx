import React, { JSX } from "react";
import { StringUtils } from "../utils/string";
import { useState } from "react";

interface IProps {
  tabs: [string, React.ReactNode][];
  defaultIndex?: number;
  onChange?: (index: number, newValue: string) => void;
}

export function Tabs2(props: IProps): JSX.Element {
  const { tabs, onChange } = props;
  const [selectedIndex, setSelectedIndex] = useState<number>(props.defaultIndex || 0);
  return (
    <div>
      <div className="flex">
        {tabs.map(([name, content], index) => {
          const nameClass = `tab-${StringUtils.dashcase(name.toLowerCase())}`;

          return (
            <div className="flex-1 text-center border-b border-grayv2-50">
              <button
                className={`ls-${nameClass} inline-block text-base px-4 pb-1 outline-none focus:outline-none ${
                  selectedIndex === index ? "text-orangev2 border-b border-orangev2" : ""
                } nm-${nameClass}`}
                style={selectedIndex === index ? { borderBottomWidth: "2px" } : {}}
                data-cy={nameClass}
                onClick={() => {
                  if (onChange) {
                    onChange(index, name);
                  }
                  setSelectedIndex(index);
                }}
              >
                {name}
              </button>
            </div>
          );
        })}
      </div>
      {tabs[selectedIndex][1]}
    </div>
  );
}
