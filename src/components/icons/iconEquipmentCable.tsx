import { h, JSX } from "preact";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IIconEquipmentCableProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconEquipmentCable(props: IIconEquipmentCableProps): JSX.Element {
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
        d="M0.59082 16.6636L2.95859 15.2261C3.74081 14.7511 4.63837 14.5 5.55348 14.5H18.1381C19.087 14.5 20.0162 14.77 20.8174 15.2785L22.9999 16.6636"
        stroke-width="2"
      />
      <path d="M12 6L12 14" stroke-width="1.5" />
      <path d="M5 26.5686V8C5 6.34315 6.34315 5 8 5H16C17.6569 5 19 6.34315 19 8V27" stroke-width="1.5" />
      <rect x="8.93654" y="4.61818" width="6.18182" height="1.23636" stroke-width="1.23636" />
    </svg>
  );
}
