import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
}

export function IconScale(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().blackv2;
  return (
    <svg
      width={size}
      className="inline-block"
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.5"
      stroke={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15.8296 4C17.6928 4 19.317 5.26812 19.7689 7.07577V7.07577C20.5772 10.3088 20.5772 13.6912 19.7689 16.9242V16.9242C19.317 18.7319 17.6928 20 15.8296 20L12 20L8.17043 20C6.30715 20 4.68297 18.7319 4.23106 16.9242V16.9242C3.42279 13.6912 3.42279 10.3088 4.23106 7.07577V7.07577C4.68297 5.26812 6.30715 4 8.17044 4L12 4L15.8296 4Z"
        stroke-linejoin="round"
      />
      <path d="M12 12L12 9" stroke-linejoin="round" />
      <rect x="7.75" y="6.75" width="8.5" height="4.5" rx="2.25" />
    </svg>
  );
}
