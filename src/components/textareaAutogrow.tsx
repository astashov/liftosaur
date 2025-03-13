import { JSX, h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";

interface IProps extends JSX.HTMLAttributes<HTMLTextAreaElement> {
  onChangeText?: (text: string) => void;
}

export function TextareaAutogrow(props: IProps): JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState(props.value);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = value ? `${textareaRef.current.scrollHeight}px` : "1rem";
    }
  }, [value]);

  const handleChange = (event: Event) => {
    const target = event.target as HTMLTextAreaElement;
    setValue(target.value);
    if (props.onChangeText) {
      props.onChangeText(target.value);
    }
  };

  const { onChangeText, className, ...otherProps } = props;

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
