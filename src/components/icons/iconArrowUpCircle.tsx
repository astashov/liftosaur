import React, { JSX } from "react";

interface IProps {
  className?: string;
  style?: React.CSSProperties;
  color: string;
}

export function IconArrowUpCircle(props: IProps): JSX.Element {
  return (
    <svg
      style={props.style}
      className={props.className}
      width="19"
      height="19"
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.2083 9.49996C18.2083 14.3095 14.3095 18.2083 9.49996 18.2083C4.69047 18.2083 0.791626 14.3095 0.791626 9.49996C0.791626 4.69047 4.69047 0.791626 9.49996 0.791626C14.3095 0.791626 18.2083 4.69047 18.2083 9.49996ZM7.2217 9.33086C6.91588 9.66941 6.3935 9.69598 6.05494 9.39015C5.71635 9.08437 5.68979 8.56199 5.99561 8.22344L8.88693 5.02233C9.04352 4.84892 9.2663 4.74996 9.49996 4.74996C9.73362 4.74996 9.95636 4.84892 10.113 5.02233L13.0043 8.22344C13.3101 8.56199 13.2835 9.08437 12.945 9.39015C12.6064 9.69598 12.084 9.66941 11.7782 9.33086L10.326 7.72306V13.4239C10.326 13.8801 9.9562 14.25 9.49996 14.25C9.04372 14.25 8.67385 13.8801 8.67385 13.4239V7.72306L7.2217 9.33086Z"
        fill={props.color}
      />
    </svg>
  );
}
