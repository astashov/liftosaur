import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  isChecked: boolean;
  color?: string;
  style?: JSX.CSSProperties;
  size?: number;
  className?: string;
}

export function IconCheckCircle(props: IProps): JSX.Element {
  const color = props.color || Tailwind.colors().purplev3.main;
  const size = props.size || 20;
  if (props.isChecked) {
    return (
      <svg
        style={props.style}
        className={props.className}
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10Z"
          fill={color}
        />
        <path
          d="M14.5 7L8.70846 13L6.5 10.6139"
          stroke="white"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    );
  } else {
    return (
      <div
        style={{ ...props.style, width: size, height: size, borderWidth: "2px" }}
        className={`${props.className ?? ""} box-content border rounded-full border-bluev2`}
      />
    );
  }
}
