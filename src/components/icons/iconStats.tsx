import { h, JSX } from "preact";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
}

export function IconStats(props: IProps): JSX.Element {
  const size = props.size ?? 20;
  const color = props.color ?? Tailwind_semantic().icon.neutral;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4.70581" width="3" height="9.41176" fill={color} />
      <rect x="7" y="0.941162" width="3" height="13.1765" fill={color} />
      <rect x="12" y="7.52942" width="3" height="6.58824" fill={color} />
      <rect x="16" y="15.0588" width="0.941177" height="15" transform="rotate(90 16 15.0588)" fill={color} />
    </svg>
  );
}
