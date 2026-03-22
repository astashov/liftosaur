declare module "react-native" {
  import React from "react";

  interface ViewProps {
    className?: string;
    children?: React.ReactNode;
    style?: any;
  }
  export const View: React.FC<ViewProps>;

  interface TextProps {
    className?: string;
    children?: React.ReactNode;
    style?: any;
    numberOfLines?: number;
  }
  export const Text: React.FC<TextProps>;

  interface ImageProps {
    source: { uri: string };
    className?: string;
    style?: any;
    resizeMode?: "cover" | "contain" | "stretch" | "center";
  }
  export const Image: React.FC<ImageProps>;

  interface PressableProps {
    className?: string;
    children?: React.ReactNode;
    style?: any;
    onPress?: () => void;
  }
  export const Pressable: React.FC<PressableProps>;

  interface ScrollViewProps {
    className?: string;
    children?: React.ReactNode;
    style?: any;
  }
  export const ScrollView: React.FC<ScrollViewProps>;
}
