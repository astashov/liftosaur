import { h, JSX } from "preact";

interface IIconEProps {
  width?: number;
  height?: number;
  color?: string;
}

export function IconE(props: IIconEProps): JSX.Element {
  const color = props.color || "#3C5063";
  return (
    <svg
      width={props.width || 22}
      height={props.height || 30}
      viewBox="0 0 22 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M17.1541 27.4007H4.8459C2.73045 27.4007 1 25.6539 1 23.5185V4.88317C1 2.74773 2.73045 1 4.8459 1H10.4227C11.0005 1 11.6736 1.2909 12.1546 1.5818L20.4236 9.929C20.9046 10.414 21 10.9972 21 11.6772V23.518C21 25.6539 19.3664 27.4007 17.1541 27.4007Z"
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M10.9994 1.36621V7.24732C10.9994 7.24732 10.8928 11.2161 14.2824 11.1483H20.5194"
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M10.262 16.09V18.078H13.468V19.926H10.262V22.082H13.888V24H7.868V14.172H13.888V16.09H10.262Z"
        fill={color}
      />
    </svg>
  );
}
