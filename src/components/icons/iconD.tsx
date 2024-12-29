import React, { JSX } from "react";

interface IIconDProps {
  width?: number;
  height?: number;
  color?: string;
}

export function IconD(props: IIconDProps): JSX.Element {
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
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.1541 27.4007H4.8459C2.73045 27.4007 1 25.6539 1 23.5185V4.88317C1 2.74773 2.73045 1 4.8459 1H10.4227C11.0005 1 11.6736 1.2909 12.1546 1.5818L20.4236 9.929C20.9046 10.414 21 10.9972 21 11.6772V23.518C21 25.6539 19.3664 27.4007 17.1541 27.4007Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.9994 1.36621V7.24732C10.9994 7.24732 10.8928 11.2161 14.2824 11.1483H20.5194"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.55 14.172C11.586 14.172 12.4913 14.3773 13.266 14.788C14.0407 15.1987 14.638 15.7773 15.058 16.524C15.4873 17.2613 15.702 18.1153 15.702 19.086C15.702 20.0473 15.4873 20.9013 15.058 21.648C14.638 22.3947 14.036 22.9733 13.252 23.384C12.4773 23.7947 11.5767 24 10.55 24H6.868V14.172H10.55ZM10.396 21.928C11.3013 21.928 12.006 21.6807 12.51 21.186C13.014 20.6913 13.266 19.9913 13.266 19.086C13.266 18.1807 13.014 17.476 12.51 16.972C12.006 16.468 11.3013 16.216 10.396 16.216H9.262V21.928H10.396Z"
        fill={color}
      />
    </svg>
  );
}
