import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  style?: { [key: string]: string | number };
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function IconWatch(props: IProps): JSX.Element {
  const color = props.color || Tailwind.colors().grayv3.main;
  const width = props.width || 17;
  const height = props.height || 22;
  return (
    <svg
      width={width}
      height={height}
      className={`inline-block ${props.className || ""}`}
      style={props.style}
      viewBox="0 0 17 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.187 6.72466L13.2643 5.24117M6.58297 3.66675H10.2496M8.41667 8.2493V11.9167H12.0833M14.8333 11.9167C14.8333 15.4606 11.9605 18.3334 8.41667 18.3334C4.87283 18.3334 2 15.4606 2 11.9167C2 8.37291 4.87283 5.50008 8.41667 5.50008C11.9605 5.50008 14.8333 8.37291 14.8333 11.9167Z"
        stroke={color}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
