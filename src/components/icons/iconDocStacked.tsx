import React, { JSX } from "react";

interface IProps {
  style?: { [key: string]: string | number };
  width?: number;
  height?: number;
  className?: string;
  color?: string;
}

export function IconDocStacked(props: IProps): JSX.Element {
  const color = props.color || "#3C5063";
  const width = props.width || 25;
  const height = props.height || 27;
  return (
    <svg
      className={props.className}
      style={props.style}
      width={width}
      height={height}
      viewBox="0 0 25 27"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.6581 25.9999H4.25166C2.46307 25.9999 1 24.523 1 22.7175V6.96163C1 5.15615 2.46307 3.67847 4.25166 3.67847H8.96678C9.45525 3.67847 10.0244 3.92442 10.431 4.17037L17.4224 11.2278C17.829 11.6379 17.9097 12.131 17.9097 12.7059V22.7171C17.9097 24.523 16.5285 25.9999 14.6581 25.9999Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.45491 3.98779V8.96019C9.45491 8.96019 9.36481 12.3157 12.2306 12.2584H17.5039"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.4437 25.1068H6.0373C4.24871 25.1068 2.78564 23.6299 2.78564 21.8245V6.06857C2.78564 4.26308 4.24871 2.7854 6.0373 2.7854H10.7524C11.2409 2.7854 11.8101 3.03135 12.2167 3.2773L19.2081 10.3347C19.6147 10.7448 19.6954 11.2379 19.6954 11.8128V21.8241C19.6954 23.6299 18.3142 25.1068 16.4437 25.1068Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.2405 3.09521V8.06761C11.2405 8.06761 11.1505 11.4231 14.0163 11.3658H19.2896"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.2294 24.2145H7.82295C6.03436 24.2145 4.57129 22.7376 4.57129 20.9321V5.17623C4.57129 3.37075 6.03436 1.89307 7.82295 1.89307H12.5381C13.0265 1.89307 13.5957 2.13902 14.0023 2.38497L20.9937 9.44241C21.4003 9.85246 21.481 10.3456 21.481 10.9205V20.9317C21.481 22.7376 20.0998 24.2145 18.2294 24.2145Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.0262 1.30908V6.28148C13.0262 6.28148 12.9361 9.63701 15.8019 9.57968H21.0752"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20.015 23.3214H9.60859C7.82 23.3214 6.35693 21.8445 6.35693 20.0391V4.28317C6.35693 2.47768 7.82 1 9.60859 1H14.3237C14.8122 1 15.3814 1.24595 15.788 1.4919L22.7794 8.54935C23.186 8.9594 23.2667 9.45249 23.2667 10.0274V20.0387C23.2667 21.8445 21.8855 23.3214 20.015 23.3214Z"
        fill="white"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.8118 1.30908V6.28148C14.8118 6.28148 14.7217 9.63701 17.5876 9.57968H22.8609"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.2588 13.9438H19.3647"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.2134 18.2563H19.3189"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
