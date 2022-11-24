import { h, JSX } from "preact";

interface IProps {
  color?: string;
  style?: { [key: string]: string | number };
}

export function IconGraphs2(props: IProps): JSX.Element {
  const color = props.color || "#3C5063";
  return (
    <svg
      style={props.style}
      className="inline-block"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0.833344 0.833252V19.1666H19.1667" stroke={color} stroke-linecap="round" stroke-linejoin="round" />
      <path
        d="M0.833344 17.4999L7.50001 10.8333L11.4583 14.7916L19.1667 7.08325"
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M0.833344 11.2499L7.50001 4.58325L11.4583 8.54159L19.1667 0.833252"
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
