import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconKettlebellSmall(props: IProps): JSX.Element {
  const size = props.size ?? 14;
  const color = props.color ?? Tailwind.colors().blackv2;
  return (
    <svg
      width={size}
      height={size}
      className={props.className}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.96875 7.14282L4.34705 3.82711C4.23166 3.2117 4.70379 2.64282 5.32993 2.64282H9.67007C10.2962 2.64282 10.7683 3.2117 10.6529 3.82711L10.0312 7.14282"
        stroke={color}
      />
      <path
        d="M9.30261 6.88928C7.59166 6.28746 5.47318 6.56206 4.1662 7.73766C3.4028 8.42434 3 9.33953 3 10.2888C3 11.232 3.39188 12.0895 4.0354 12.7613C4.39642 13.1382 4.95439 13.3303 5.51879 13.3303H9.48121C10.0456 13.3303 10.6036 13.1382 10.9646 12.7613C11.6082 12.0895 12 11.232 12 10.2888C12 10.1941 11.9962 10.1001 11.9885 10.0071C11.8956 8.87296 11.2302 7.86353 10.1194 7.25335C9.86046 7.11113 9.58664 6.98915 9.30261 6.88928Z"
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
