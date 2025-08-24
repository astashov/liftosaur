import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  style?: { [key: string]: string | number };
  width?: number;
  height?: number;
  color?: string;
}

export function IconUndo(props: IProps): JSX.Element {
  const width = props.width || 24;
  const height = props.height || 24;
  const color = props.color || Tailwind.semantic().icon.neutral;
  return (
    <svg
      style={props.style}
      width={width}
      height={height}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.16645 21.8503C1.94452 21.6506 1.94452 21.3026 2.16645 21.1028L21.0251 4.13007C21.3487 3.83884 21.8643 4.06848 21.8643 4.50381V16.4483C35.1941 16.4483 46 27.2542 46 40.584C46 41.4921 45.9498 42.3885 45.8522 43.2706C45.7924 43.8106 45.034 43.8362 44.8694 43.3185C41.7688 33.5684 32.6415 26.5049 21.8643 26.5049V38.4493C21.8643 38.8847 21.3487 39.1143 21.0251 38.8231L2.16645 21.8503Z"
        fill={color}
      />
    </svg>
  );
}
