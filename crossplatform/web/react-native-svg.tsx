import type { JSX, ReactNode } from "react";

interface ISvgProps {
  width?: number | string;
  height?: number | string;
  viewBox?: string;
  fill?: string;
  className?: string;
  style?: Record<string, string | number>;
  children?: ReactNode;
}

export function Svg(props: ISvgProps): JSX.Element {
  return <svg {...props} />;
}

interface IPathProps {
  d?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: string | number;
  strokeLinecap?: "butt" | "round" | "square" | "inherit";
  strokeLinejoin?: "miter" | "round" | "bevel" | "inherit";
  fillRule?: "nonzero" | "evenodd" | "inherit";
  clipRule?: "nonzero" | "evenodd" | "inherit";
}

export function Path(props: IPathProps): JSX.Element {
  return <path {...props} />;
}

interface IRectProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  rx?: number | string;
  ry?: number | string;
  fill?: string;
}

export function Rect(props: IRectProps): JSX.Element {
  return <rect {...props} />;
}

interface ICircleProps {
  cx?: number | string;
  cy?: number | string;
  r?: number | string;
  fill?: string;
  stroke?: string;
  strokeWidth?: string | number;
}

export function Circle(props: ICircleProps): JSX.Element {
  return <circle {...props} />;
}

interface IGProps {
  children?: ReactNode;
  transform?: string;
  fill?: string;
}

export function G(props: IGProps): JSX.Element {
  return <g {...props} />;
}

export default Svg;
