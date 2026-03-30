import type { JSX } from "react";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IIconEquipmentKettlebellProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconEquipmentKettlebell(props: IIconEquipmentKettlebellProps): JSX.Element {
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
      <path
        d="M5.0178 15.4906C5.11793 14.1873 5.64217 12.9968 6.45221 12.0197L5.58858 8.30797C5.35922 7.24573 5.6531 6.15611 6.39448 5.31827C7.13587 4.48042 8.2318 4 9.40152 4H14.5984C15.7681 4 16.8641 4.48051 17.6054 5.31827C18.3467 6.15611 18.6407 7.24573 18.4113 8.30797L17.5434 12.0398C18.444 13.1309 19 14.4782 19 15.9576C19 17.5213 18.3904 18.9428 17.3894 20.0566C16.8278 20.6814 15.9598 21 15.0819 21H8.91812C8.04017 21 7.17222 20.6814 6.61062 20.0566C5.6095 18.9428 5 17.5214 5 15.9576C5 15.8006 5.00587 15.6448 5.0178 15.4906ZM8.63902 7.74238L9.19566 10.3208C10.0565 9.97057 10.9997 9.76274 12 9.76274C12.9996 9.76274 13.9458 9.96352 14.806 10.3131L15.361 7.74238C15.4233 7.45185 15.2865 7.2436 15.1992 7.14517C15.1125 7.04666 14.9181 6.88133 14.5984 6.88133H9.40152C9.08176 6.88133 8.88728 7.04666 8.80074 7.14517C8.71336 7.2436 8.5768 7.45185 8.63902 7.74238Z"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
