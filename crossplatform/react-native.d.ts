declare module "react-native" {
  import { FunctionComponent, ComponentChildren } from "preact";

  interface IViewProps {
    className?: string;
    children?: ComponentChildren;
    style?: Record<string, unknown>;
    "data-cy"?: string;
    "data-id"?: string | number;
    id?: string;
  }
  export const View: FunctionComponent<IViewProps>;

  interface ITextProps {
    className?: string;
    children?: ComponentChildren;
    style?: Record<string, unknown>;
    numberOfLines?: number;
    "data-cy"?: string;
  }
  export const Text: FunctionComponent<ITextProps>;

  interface IImageProps {
    source: { uri: string };
    className?: string;
    style?: Record<string, unknown>;
    resizeMode?: "cover" | "contain" | "stretch" | "center";
    onLoad?: () => void;
    onError?: () => void;
    "data-cy"?: string;
  }
  export const Image: FunctionComponent<IImageProps>;

  interface IPressableProps {
    className?: string;
    children?: ComponentChildren;
    style?: Record<string, unknown>;
    onPress?: () => void;
    disabled?: boolean;
    "data-cy"?: string;
  }
  export const Pressable: FunctionComponent<IPressableProps>;

  interface IScrollViewProps {
    className?: string;
    children?: ComponentChildren;
    style?: Record<string, unknown>;
  }
  export const ScrollView: FunctionComponent<IScrollViewProps>;

  export const Animated: {
    View: FunctionComponent<{ style?: Record<string, unknown>; children?: ComponentChildren }>;
    Value: new (value: number) => {
      interpolate(config: { inputRange: number[]; outputRange: string[] }): unknown;
    };
    timing(
      value: unknown,
      config: { toValue: number; duration: number; easing: (value: number) => number; useNativeDriver: boolean }
    ): { start(): void; stop(): void };
    loop(animation: { start(): void; stop(): void }): { start(): void; stop(): void };
  };

  export const Easing: {
    linear: (value: number) => number;
  };
}

declare module "react-native-svg" {
  import { FunctionComponent, ComponentChildren } from "preact";

  interface ISvgProps {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
    fill?: string;
    className?: string;
    style?: Record<string, unknown>;
    children?: ComponentChildren;
  }
  export const Svg: FunctionComponent<ISvgProps>;

  interface IPathProps {
    d?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: string | number;
    strokeLinecap?: string;
    strokeLinejoin?: string;
    fillRule?: string;
    clipRule?: string;
  }
  export const Path: FunctionComponent<IPathProps>;

  interface IRectProps {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    rx?: number | string;
    ry?: number | string;
    fill?: string;
  }
  export const Rect: FunctionComponent<IRectProps>;

  interface ICircleProps {
    cx?: number | string;
    cy?: number | string;
    r?: number | string;
    fill?: string;
    stroke?: string;
    strokeWidth?: string | number;
  }
  export const Circle: FunctionComponent<ICircleProps>;

  export default Svg;
}

declare module "markdown-to-jsx" {
  import { FunctionComponent } from "preact";

  interface IMarkdownProps {
    children: string;
    options?: {
      overrides?: Record<string, { component: FunctionComponent<Record<string, unknown>> }>;
      forceBlock?: boolean;
    };
  }
  const Markdown: FunctionComponent<IMarkdownProps>;
  export default Markdown;
}
