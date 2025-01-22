import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  style?: { [key: string]: string | number };
  width?: number;
  height?: number;
  className?: string;
  color?: string;
}

export function IconDoc(props: IProps): JSX.Element {
  const color = props.color || Tailwind.colors().grayv2["900"];
  const width = props.width || 17;
  const height = props.height || 22;
  return (
    <svg
      style={props.style}
      className={`inline-block ${props.className}`}
      width={width}
      height={height}
      viewBox="0 0 17 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M13.1195 20.807H3.88537C2.29826 20.807 1 19.4965 1 17.8944V3.91333C1 2.31123 2.29826 1 3.88537 1H8.06936C8.50281 1 9.00786 1.21825 9.36866 1.43649L15.5725 7.69895C15.9333 8.06281 16.0049 8.50035 16.0049 9.01053V17.894C16.0049 19.4965 14.7793 20.807 13.1195 20.807Z"
        stroke={color}
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M8.50246 1.27441V5.68669C8.50246 5.68669 8.42252 8.66424 10.9655 8.61336H15.6448"
        stroke={color}
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M4.46238 12.4861H12.5425"
        stroke={color}
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M4.42206 16.3123H12.5019"
        stroke={color}
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
