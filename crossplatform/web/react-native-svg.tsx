import React from "react";

type SvgProps = React.SVGAttributes<SVGSVGElement> & { children?: React.ReactNode };
type PathProps = React.SVGAttributes<SVGPathElement>;
type RectProps = React.SVGAttributes<SVGRectElement>;
type CircleProps = React.SVGAttributes<SVGCircleElement>;

export function Svg(props: SvgProps): React.ReactElement {
  return <svg {...props} />;
}

export function Path(props: PathProps): React.ReactElement {
  return <path {...props} />;
}

export function Rect(props: RectProps): React.ReactElement {
  return <rect {...props} />;
}

export function Circle(props: CircleProps): React.ReactElement {
  return <circle {...props} />;
}

export default Svg;
