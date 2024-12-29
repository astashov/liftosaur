import React, { JSX } from "react";

interface IProps {
  size?: number;
  color?: string;
  fill?: string;
  className?: string;
}

export function IconHelp(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? "#171718";
  return (
    <svg
      className={props.className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 22C17.5229 22 22 17.5229 22 12C22 6.47715 17.5229 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5229 6.47715 22 12 22Z"
        stroke={color}
        fill={props.fill}
      />
      <path
        d="M11.0232 14C11.0232 13.4078 11.1 12.9358 11.2535 12.584C11.407 12.2322 11.7093 11.847 12.1604 11.4284C12.6163 11.0054 12.9047 10.7049 13.0256 10.5267C13.2117 10.2551 13.3047 9.9612 13.3047 9.64505C13.3047 9.22645 13.1954 8.9081 12.9768 8.6899C12.7628 8.46725 12.4465 8.3559 12.0279 8.3559C11.6279 8.3559 11.3047 8.465 11.0582 8.6832C10.8163 8.89695 10.6953 9.1886 10.6953 9.5582H9C9.0093 8.77005 9.28835 8.14665 9.8372 7.688C10.3907 7.22935 11.1209 7 12.0279 7C12.9628 7 13.6907 7.2271 14.2116 7.6813C14.7372 8.1355 15 8.77005 15 9.5849C15 10.3107 14.6465 11.0255 13.9396 11.729L13.0814 12.5372C12.7744 12.8712 12.6163 13.3588 12.607 14H11.0232Z"
        fill={color}
      />
      <path d="M12.5 15.5H11V17H12.5V15.5Z" fill={color} />
    </svg>
  );
}
