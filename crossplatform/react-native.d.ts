declare module "react-native" {
  import React from "react";

  interface ViewProps {
    className?: string;
    children?: React.ReactNode;
    style?: any;
    "data-cy"?: string;
    "data-id"?: string | number;
    id?: string;
  }
  export const View: React.FC<ViewProps>;

  interface TextProps {
    className?: string;
    children?: React.ReactNode;
    style?: any;
    numberOfLines?: number;
    "data-cy"?: string;
  }
  export const Text: React.FC<TextProps>;

  interface ImageProps {
    source: { uri: string };
    className?: string;
    style?: any;
    resizeMode?: "cover" | "contain" | "stretch" | "center";
    onLoad?: () => void;
    onError?: () => void;
    "data-cy"?: string;
  }
  export const Image: React.FC<ImageProps>;

  interface PressableProps {
    className?: string;
    children?: React.ReactNode;
    style?: any;
    onPress?: () => void;
    disabled?: boolean;
    "data-cy"?: string;
  }
  export const Pressable: React.FC<PressableProps>;

  interface ScrollViewProps {
    className?: string;
    children?: React.ReactNode;
    style?: any;
  }
  export const ScrollView: React.FC<ScrollViewProps>;
}

declare module "react-native-svg" {
  import React from "react";

  interface SvgProps {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
    fill?: string;
    className?: string;
    style?: any;
    children?: React.ReactNode;
  }
  export function Svg(props: SvgProps): React.ReactElement;

  interface PathProps {
    d?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: string | number;
    strokeLinecap?: string;
    strokeLinejoin?: string;
    fillRule?: string;
    clipRule?: string;
  }
  export function Path(props: PathProps): React.ReactElement;

  interface RectProps {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    rx?: number | string;
    ry?: number | string;
    fill?: string;
  }
  export function Rect(props: RectProps): React.ReactElement;

  interface CircleProps {
    cx?: number | string;
    cy?: number | string;
    r?: number | string;
    fill?: string;
    stroke?: string;
  }
  export function Circle(props: CircleProps): React.ReactElement;

  export default Svg;
}

declare module "markdown-to-jsx" {
  import React from "react";

  interface MarkdownProps {
    children: string;
    options?: {
      overrides?: Record<string, { component: React.FC<any> }>;
      forceBlock?: boolean;
    };
  }
  const Markdown: React.FC<MarkdownProps>;
  export default Markdown;
}
