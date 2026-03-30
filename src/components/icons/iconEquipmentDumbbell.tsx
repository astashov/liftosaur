import type { JSX } from "react";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IIconEquipmentDumbbellProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconEquipmentDumbbell(props: IIconEquipmentDumbbellProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind_semantic().icon.neutral;
  return (
    <svg
      width={size}
      height={size}
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask id="path-1-inside-1_4385_1523" fill="white">
        <rect x="1" y="10.3" width="22" height="4.4" rx="1" />
      </mask>
      <rect
        x="1"
        y="10.3"
        width="22"
        height="4.4"
        rx="1"
        stroke="#3C5063"
        strokeWidth="3"
        mask="url(#path-1-inside-1_4385_1523)"
      />
      <mask id="path-2-inside-2_4385_1523" fill="white">
        <rect x="3.2002" y="7" width="5.5" height="11" rx="1" />
      </mask>
      <rect
        x="3.2002"
        y="7"
        width="5.5"
        height="11"
        rx="1"
        fill="#FAF8FF"
        stroke="#3C5063"
        strokeWidth="3"
        mask="url(#path-2-inside-2_4385_1523)"
      />
      <mask id="path-3-inside-3_4385_1523" fill="white">
        <rect x="15.2998" y="7" width="5.5" height="11" rx="1" />
      </mask>
      <rect
        x="15.2998"
        y="7"
        width="5.5"
        height="11"
        rx="1"
        fill="#FAF8FF"
        stroke="#3C5063"
        strokeWidth="3"
        mask="url(#path-3-inside-3_4385_1523)"
      />
    </svg>
  );
}
