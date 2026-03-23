import React from "react";

type ISvgProps = React.SVGAttributes<SVGSVGElement> & { children?: React.ReactNode };
type IPathProps = React.SVGAttributes<SVGPathElement>;
type IRectProps = React.SVGAttributes<SVGRectElement>;
type ICircleProps = React.SVGAttributes<SVGCircleElement>;

export function Svg(props: ISvgProps): React.ReactElement {
  return <svg {...props} />;
}

export function Path(props: IPathProps): React.ReactElement {
  return <path {...props} />;
}

export function Rect(props: IRectProps): React.ReactElement {
  return <rect {...props} />;
}

export function Circle(props: ICircleProps): React.ReactElement {
  return <circle {...props} />;
}

type IGProps = React.SVGAttributes<SVGGElement> & { children?: React.ReactNode };

export function G(props: IGProps): React.ReactElement {
  return <g {...props} />;
}

export default Svg;
