import React, { JSX } from "react";

export function IconEdit(props: { penColor: string; lineColor: string; size: number }): JSX.Element {
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 20 20" version="1.1">
      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <path
          d="M2,12 C2,11.7347835 2.10535684,11.4804296 2.29289322,11.2928932 L13.2928932,0.292893219 C13.6834175,-0.0976310729 14.3165825,-0.0976310729 14.7071068,0.292893219 L17.7071068,3.29289322 C18.0976311,3.68341751 18.0976311,4.31658249 17.7071068,4.70710678 L6.70710678,15.7071068 C6.5195704,15.8946432 6.26521649,16 6,16 L3,16 C2.44771525,16 2,15.5522847 2,15 L2,12 Z"
          id="primary"
          fill={props.penColor}
          fillRule="nonzero"
        ></path>
        <rect id="secondary" fill={props.lineColor} x="0" y="18" width="20" height="2" rx="1"></rect>
      </g>
    </svg>
  );
}
