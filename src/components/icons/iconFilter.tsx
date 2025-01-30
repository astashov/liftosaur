import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
}

export function IconFilter(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().blackv2;
  return (
    <svg
      stroke={color}
      strokeWidth="1.5"
      width={size}
      className="inline-block"
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path d="M19 8L19 20" strokeLinejoin="round" />
      <path d="M12 3L12 10" strokeLinejoin="round" />
      <path d="M12 14L12 20" strokeLinejoin="round" />
      <path d="M5 3L5 16" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="5" cy="18" r="2" />
    </svg>
  );
}
