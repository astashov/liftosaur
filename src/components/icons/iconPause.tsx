import { h, JSX } from "preact";

interface IProps {
  style?: { [key: string]: string | number };
  size?: number;
  className?: string;
  color?: string;
}

export function IconPause(props: IProps): JSX.Element {
  const color = props.color || "#3C5063";
  const width = props.size || 24;
  const height = props.size || 24;
  return (
    <svg
      style={props.style}
      className={`inline-block ${props.className}`}
      width={width}
      height={height}
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="9.81024" cy="9.79712" r="8" stroke={color} stroke-width="2" />
      <rect x="7.31024" y="6.29712" width="1" height="7" rx="0.5" fill={color} stroke={color} />
      <rect x="11.3102" y="6.29712" width="1" height="7" rx="0.5" fill={color} stroke={color} />
    </svg>
  );
}
