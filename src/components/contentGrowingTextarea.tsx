import { h, JSX } from "preact";
import { useRef, useState, useLayoutEffect } from "preact/hooks";

interface IContentGrowingTextareaProps {
  value: string;
  onInput?: (value: string) => void;
  className?: string;
}

export function ContentGrowingTextarea({ value, onInput, className = "" }: IContentGrowingTextareaProps): JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [localValue, setLocalValue] = useState(value);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    mirrorRef.current!.textContent = localValue || " ";
    const rect = mirrorRef.current!.getBoundingClientRect();
    setDimensions({ width: rect.width, height: rect.height });
  }, [localValue]);

  // Sync external prop value
  useLayoutEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleInput = (e: Event): void => {
    const val = (e.target as HTMLTextAreaElement).value.replace(/[\r\n]+/g, "");
    setLocalValue(val);
    onInput?.(val);
  };

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Enter") {
      e.preventDefault(); // prevent newlines
    }
  };

  const handleBlur = (): void => {
    if (localValue.trim() === "") {
      setLocalValue(value);
    }
  };

  return (
    <div className="relative inline-block align-text-top">
      <div
        ref={mirrorRef}
        className={`invisible whitespace-pre-wrap break-words inline-block ${className}`}
        style={{ minHeight: "1em", whiteSpace: "pre-wrap" }}
        aria-hidden
      />

      <textarea
        ref={textareaRef}
        value={localValue}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`absolute top-0 left-0 resize-none overflow-hidden bg-transparent border-none outline-none p-0 m-0 text-inherit leading-inherit font-inherit underline ${className}`}
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
        }}
      />
    </div>
  );
}
