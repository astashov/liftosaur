import { h, JSX } from "preact";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconEyeClosed(props: IProps): JSX.Element {
  const size = props.size ?? 20;
  const color = props.color ?? Tailwind_semantic().icon.neutral;
  return (
    <svg
      width={size}
      height={size}
      className={props.className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.9499 14.9499C13.5254 16.0358 11.7908 16.6373 9.99992 16.6666C4.16658 16.6666 0.833252 9.99992 0.833252 9.99992C1.86983 8.06816 3.30753 6.38042 5.04992 5.04992M8.24992 3.53325C8.82353 3.39898 9.4108 3.33187 9.99992 3.33325C15.8333 3.33325 19.1666 9.99992 19.1666 9.99992C18.6607 10.9463 18.0575 11.8372 17.3666 12.6582M11.7666 11.7666C11.5377 12.0122 11.2617 12.2092 10.955 12.3459C10.6484 12.4825 10.3173 12.556 9.98166 12.5619C9.64598 12.5678 9.31255 12.5061 9.00126 12.3803C8.68997 12.2546 8.40719 12.0674 8.16979 11.83C7.93239 11.5926 7.74525 11.3099 7.61951 10.9986C7.49377 10.6873 7.43202 10.3539 7.43795 10.0182C7.44387 9.6825 7.51734 9.35146 7.65398 9.04479C7.79062 8.73813 7.98763 8.46212 8.23325 8.23325M0.833252 0.833252L19.1666 19.1666"
        stroke={color}
        stroke-width="1.42657"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
