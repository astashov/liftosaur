import { h, JSX } from "preact";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  style?: { [key: string]: string | number };
  size?: number;
  className?: string;
  color?: string;
}

export function IconMagnifyingGlass(props: IProps): JSX.Element {
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <svg
      style={props.style}
      className={props.className}
      width={props.size || 18}
      height={props.size || 18}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.56787 13.877C8.9541 13.877 10.2324 13.4287 11.2783 12.6816L15.2129 16.6162C15.3955 16.7988 15.6362 16.8901 15.8936 16.8901C16.4331 16.8901 16.8149 16.4751 16.8149 15.9438C16.8149 15.6948 16.7319 15.4541 16.5493 15.2798L12.6396 11.3618C13.4614 10.2827 13.9512 8.94629 13.9512 7.49365C13.9512 3.98242 11.0791 1.11035 7.56787 1.11035C4.06494 1.11035 1.18457 3.97412 1.18457 7.49365C1.18457 11.0049 4.05664 13.877 7.56787 13.877ZM7.56787 12.499C4.82861 12.499 2.5625 10.2329 2.5625 7.49365C2.5625 4.75439 4.82861 2.48828 7.56787 2.48828C10.3071 2.48828 12.5732 4.75439 12.5732 7.49365C12.5732 10.2329 10.3071 12.499 7.56787 12.499Z"
        fill={color}
      />
    </svg>
  );
}
