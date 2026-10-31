import { JSX, useEffect, useState } from "react";
import { Image, Linking, Pressable } from "react-native";

interface IProps {
  src: string;
  alt: string;
}

export function MarkdownImage(props: IProps): JSX.Element | null {
  const [size, setSize] = useState<{ width: number; height: number } | undefined>(undefined);

  useEffect(() => {
    let isActive = true;
    setSize(undefined);
    Image.getSize(
      props.src,
      (width, height) => {
        if (isActive && width > 0 && height > 0) {
          setSize({ width, height });
        }
      },
      () => undefined
    );
    return () => {
      isActive = false;
    };
  }, [props.src]);

  if (!size) {
    return null;
  }
  return (
    <Pressable
      className="self-start mb-2"
      style={{ width: size.width, maxWidth: "100%" }}
      accessibilityRole="imagebutton"
      accessibilityLabel={props.alt || undefined}
      onPress={() => Linking.openURL(props.src)}
    >
      <Image
        source={{ uri: props.src }}
        className="rounded"
        style={{ width: "100%", aspectRatio: size.width / size.height }}
        resizeMode="contain"
      />
    </Pressable>
  );
}
