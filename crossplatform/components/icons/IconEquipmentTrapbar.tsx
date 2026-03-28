import type { JSX } from "react";
import { Svg, Path } from "react-native-svg";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconEquipmentTrapbar(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} className={props.className} viewBox="0 0 24 24" fill="none" stroke={color}>
      <Path
        d="M23.0423 0.957573L18.9859 5.01397M18.9859 5.01397L11.7946 3.98665C10.8599 3.85311 9.91675 4.16748 9.24905 4.83518L4.83507 9.24916C4.16737 9.91686 3.853 10.86 3.98654 11.7947L5.01386 18.986M18.9859 5.01397L20.0132 12.2052C20.1468 13.14 19.8324 14.0831 19.1647 14.7508L14.7507 19.1648C14.083 19.8325 13.1399 20.1469 12.2051 20.0133L5.01386 18.986M5.01386 18.986L0.957465 23.0424"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Path d="M14.1411 4.45044L19.5496 9.85897" strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M4.44971 14.1409L9.85824 19.5494" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}
