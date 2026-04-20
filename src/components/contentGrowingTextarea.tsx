import { JSX, useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";

interface IContentGrowingTextareaProps {
  value: string;
  onInput?: (value: string) => void;
  className?: string;
}

export function ContentGrowingTextarea({ value, onInput, className = "" }: IContentGrowingTextareaProps): JSX.Element {
  const [localValue, setLocalValue] = useState(value);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <View className="self-start">
      <Text
        className={`underline ${className}`}
        style={{ opacity: 0 }}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setDimensions({ width, height });
        }}
      >
        {localValue || " "}
      </Text>
      <TextInput
        value={localValue}
        multiline
        scrollEnabled={false}
        onChangeText={(text) => {
          const stripped = text.replace(/[\r\n]+/g, "");
          setLocalValue(stripped);
          onInput?.(stripped);
        }}
        onBlur={() => {
          if (localValue.trim() === "") {
            setLocalValue(value);
          }
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: dimensions.width,
          height: dimensions.height,
          padding: 0,
          margin: 0,
        }}
        className={`underline ${className}`}
      />
    </View>
  );
}
