import { h, JSX } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import { StringUtils } from "../utils/string";
import { inputClassName } from "./input";

interface IMultiselectProps {
  readonly values: Readonly<string[]>;
  readonly label: string;
  readonly id: string;
  readonly initialSelectedValues?: Set<string>;
  readonly placeholder?: string;
  onChange: (values: Set<string>) => void;
}

function shouldShowAtTop(input: HTMLInputElement, windowHeight: number): boolean {
  const rect = input.getBoundingClientRect();
  const value = rect.top + rect.height > windowHeight / 2;
  return value;
}

function listCoordinates(
  input: HTMLInputElement,
  windowHeight: number
):
  | { width: number; left: number; top: number; maxHeight: number }
  | { width: number; left: number; bottom: number; maxHeight: number } {
  const rect = input.getBoundingClientRect();
  if (shouldShowAtTop(input, windowHeight)) {
    return {
      left: 0,
      width: rect.width,
      bottom: rect.height,
      maxHeight: availableHeight(input, windowHeight),
    };
  } else {
    return {
      left: 0,
      width: rect.width,
      top: rect.height,
      maxHeight: availableHeight(input, windowHeight),
    };
  }
}

function availableHeight(input: HTMLInputElement, windowHeight: number): number {
  const rect = input.getBoundingClientRect();
  const height = shouldShowAtTop(input, windowHeight) ? rect.top - 24 : windowHeight - (rect.top + rect.height) - 24;
  return Math.min(height, 200);
}

export function Multiselect(props: IMultiselectProps): JSX.Element {
  const [selectedValues, setSelectedValues] = useState(props.initialSelectedValues || new Set<string>());
  const valuesSet = new Set(props.values);
  const input = useRef<HTMLInputElement>(null);
  const [showValuesList, setShowValuesList] = useState(false);
  const [filter, setFilter] = useState("");
  const [height, setHeight] = useState(
    typeof window !== "undefined" ? window.visualViewport?.height || window.innerHeight : 100
  );

  useEffect(() => {
    function onResize(): void {
      setHeight(window.visualViewport?.height || window.innerHeight);
    }
    window.addEventListener("resize", onResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onResize);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", onResize);
      }
    };
  }, []);

  const filteredValues = Array.from(valuesSet).filter(
    (v) => v.toLowerCase().includes(filter.toLowerCase()) && !selectedValues.has(v)
  );

  return (
    <div>
      {showValuesList && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowValuesList(false);
          }}
        />
      )}
      {props.label && (
        <div>
          <label for={props.id} className="block text-sm font-bold">
            {props.label}
          </label>
        </div>
      )}
      <div className="relative">
        <input
          className={inputClassName}
          ref={input}
          data-cy={`multiselect-${props.id}`}
          list={props.id}
          placeholder={props.placeholder}
          name={props.id}
          value={filter}
          onFocus={() => setShowValuesList(true)}
          onInput={(e) => {
            const value = e.currentTarget.value;
            setFilter(value);
          }}
        />
        {showValuesList && filteredValues.length > 0 && (
          <div
            className="absolute z-20 overflow-y-auto bg-white border-t border-l border-r shadow-sm border-grayv2-400"
            style={input.current ? listCoordinates(input.current, height) : {}}
          >
            {filteredValues.map((value) => {
              return (
                <button
                  data-cy={`multiselect-option-${StringUtils.dashcase(value)}`}
                  onClick={() => {
                    const newValues = new Set([...selectedValues, value]);
                    setSelectedValues(newValues);
                    setShowValuesList(false);
                    setFilter("");
                    props.onChange(newValues);
                  }}
                  className="relative z-30 block w-full px-4 py-2 text-left border-b cursor-pointer border-grayv2-400 hover:bg-grayv2-100"
                >
                  {value}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="mt-1">
        {Array.from(selectedValues).map((sm) => (
          <div className="inline-block px-2 mb-1 mr-1 text-xs bg-gray-300 rounded-full ">
            <span className="py-1 pl-1">{sm} </span>
            <button
              className="p-1 nm-multiselect"
              onClick={(e) => {
                e.preventDefault();
                const set = new Set(selectedValues);
                set.delete(sm);
                setSelectedValues(set);
                props.onChange(set);
              }}
            >
              <span className="inline-block" style="transform: rotate(45deg)">
                +
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
