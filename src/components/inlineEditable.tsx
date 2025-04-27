import { h, Fragment } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";

interface InlineEditableProps {
  value: string;
  onChange?: (newValue: string) => void;
  onInput?: (newValue: string) => void;
  className?: string;
}

export function InlineEditable({ value, onChange, onInput, className = "" }: InlineEditableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);

  const baseTextStyle = "whitespace-pre-wrap break-words font-normal text-base leading-snug p-0 m-0";

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      autoResize();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setInternalValue(value);
    }
  }, [value, isEditing]);

  const autoResize = () => {
    const ghost = ghostRef.current;
    const textarea = textareaRef.current;
    if (!ghost || !textarea) return;

    ghost.textContent = internalValue || " ";
    const height = ghost.offsetHeight;
    const width = ghost.offsetWidth;
    textarea.style.height = height + "px";
    textarea.style.width = width + "px";
  };

  const handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    const newValue = target.value;
    setInternalValue(newValue);
    autoResize();
    onInput?.(newValue);
  };

  const handleBlur = () => {
    // setIsEditing(false);
    const trimmed = internalValue.trim();
    if (trimmed !== value) {
      onChange?.(trimmed);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setInternalValue(value);
      setIsEditing(false);
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      textareaRef.current?.blur();
    }
  };

  return (
    <div className="relative">
      {isEditing ? (
        <>
          <textarea
            ref={textareaRef}
            value={internalValue}
            onInput={handleInput}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`w-full resize-none bg-transparent border-none focus:outline-none absolute inset-0 ${baseTextStyle} ${className}`}
            style={{
              overflow: "hidden",
              height: "1rem",
            }}
          />
          <div
            ref={ghostRef}
            aria-hidden="true"
            className={`invisible whitespace-pre-wrap break-words ${baseTextStyle} ${className}`}
            style={{
              visibility: "hidden",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              padding: "0",
              margin: "0",
            }}
          >
            {internalValue || " "}
          </div>
        </>
      ) : (
        <div onClick={() => setIsEditing(true)} className={`cursor-text ${baseTextStyle} ${className}`}>
          {value}
        </div>
      )}
    </div>
  );
}
