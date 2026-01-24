import { JSX, h } from "preact";
import { useState, useEffect, useRef, useMemo } from "preact/hooks";
import { debounce } from "../utils/throttler";

interface IProps extends JSX.HTMLAttributes<HTMLTextAreaElement> {
  onChangeText?: (text: string) => void;
  debounceMs?: number;
}

export function TextareaAutogrow(props: IProps): JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState(props.value);

  const debouncedOnChangeText = useMemo(() => {
    if (props.onChangeText && props.debounceMs) {
      return debounce(props.onChangeText, props.debounceMs);
    }
    return props.onChangeText;
  }, [props.onChangeText, props.debounceMs]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = value ? `${textareaRef.current.scrollHeight}px` : "1rem";
    }
  }, [value]);

  const handleChange = (event: Event): void => {
    const target = event.target as HTMLTextAreaElement;
    setValue(target.value);
    if (debouncedOnChangeText) {
      debouncedOnChangeText(target.value);
    }
  };

  const { onChangeText, debounceMs, className, value: _value, ...otherProps } = props;

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onInput={handleChange}
      className={`w-full text-sm bg-transparent border-none resize-none outline-none placeholder-gray-500 ${props.className}`}
      {...otherProps}
      style={{
        height: "auto", // Ensures it's dynamically set
        minHeight: "1.5rem", // This is the height of one line of text based on 16px font size
      }}
    />
  );
}
