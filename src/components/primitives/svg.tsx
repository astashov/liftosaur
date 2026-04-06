import React from "react";

type ISvgProps = React.SVGProps<SVGSVGElement> & { children?: React.ReactNode };
type IPathProps = React.SVGProps<SVGPathElement>;
type ICircleProps = React.SVGProps<SVGCircleElement>;
type IRectProps = React.SVGProps<SVGRectElement>;
type ILineProps = React.SVGProps<SVGLineElement>;
type IGProps = React.SVGProps<SVGGElement>;
type IDefsProps = React.SVGProps<SVGDefsElement>;
type IClipPathProps = React.SVGProps<SVGClipPathElement>;
type IPolygonProps = React.SVGProps<SVGPolygonElement>;
type IPolylineProps = React.SVGProps<SVGPolylineElement>;
type IEllipseProps = React.SVGProps<SVGEllipseElement>;
type IStopProps = React.SVGProps<SVGStopElement>;
type ILinearGradientProps = React.SVGProps<SVGLinearGradientElement>;
type IRadialGradientProps = React.SVGProps<SVGRadialGradientElement>;
type ITextProps = React.SVGProps<SVGTextElement>;
type ITSpanProps = React.SVGProps<SVGTSpanElement>;
type IUseProps = React.SVGProps<SVGUseElement>;
type IMaskProps = React.SVGProps<SVGMaskElement>;
type IPatternProps = React.SVGProps<SVGPatternElement>;
type IImageProps = React.SVGProps<SVGImageElement>;
type IForeignObjectProps = React.SVGProps<SVGForeignObjectElement>;
type ISymbolProps = React.SVGProps<SVGSymbolElement>;

export type ISvgComponentProps = ISvgProps;

export function Svg(props: ISvgProps): React.JSX.Element {
  return React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", ...props });
}

export function Path(props: IPathProps): React.JSX.Element {
  return React.createElement("path", props);
}

export function Circle(props: ICircleProps): React.JSX.Element {
  return React.createElement("circle", props);
}

export function Rect(props: IRectProps): React.JSX.Element {
  return React.createElement("rect", props);
}

export function Line(props: ILineProps): React.JSX.Element {
  return React.createElement("line", props);
}

export function G(props: IGProps): React.JSX.Element {
  return React.createElement("g", props);
}

export function Defs(props: IDefsProps): React.JSX.Element {
  return React.createElement("defs", props);
}

export function ClipPath(props: IClipPathProps): React.JSX.Element {
  return React.createElement("clipPath", props);
}

export function Polygon(props: IPolygonProps): React.JSX.Element {
  return React.createElement("polygon", props);
}

export function Polyline(props: IPolylineProps): React.JSX.Element {
  return React.createElement("polyline", props);
}

export function Ellipse(props: IEllipseProps): React.JSX.Element {
  return React.createElement("ellipse", props);
}

export function LinearGradient(props: ILinearGradientProps): React.JSX.Element {
  return React.createElement("linearGradient", props);
}

export function RadialGradient(props: IRadialGradientProps): React.JSX.Element {
  return React.createElement("radialGradient", props);
}

export function Stop(props: IStopProps): React.JSX.Element {
  return React.createElement("stop", props);
}

export function SvgText(props: ITextProps): React.JSX.Element {
  return React.createElement("text", props);
}

export function TSpan(props: ITSpanProps): React.JSX.Element {
  return React.createElement("tspan", props);
}

export function Use(props: IUseProps): React.JSX.Element {
  return React.createElement("use", props);
}

export function Mask(props: IMaskProps): React.JSX.Element {
  return React.createElement("mask", props);
}

export function Pattern(props: IPatternProps): React.JSX.Element {
  return React.createElement("pattern", props);
}

export function SvgImage(props: IImageProps): React.JSX.Element {
  return React.createElement("image", props);
}

export function ForeignObject(props: IForeignObjectProps): React.JSX.Element {
  return React.createElement("foreignObject", props);
}

export function SvgSymbol(props: ISymbolProps): React.JSX.Element {
  return React.createElement("symbol", props);
}
