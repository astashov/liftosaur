import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
}

export function IconDumbbell2(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().blackv2;
  return (
    <svg
      width={size}
      className="inline-block"
      height={size}
      viewBox="0 0 24 24"
      stroke={color}
      strokeWidth="1.5"
      strokeMiterlimit={10}
      fill="none"
    >
      <path d="M6.0401 11.3741L13.1112 18.4452L11.5797 19.9766C11.2105 20.3458 10.6227 20.3565 10.2667 20.0005L4.48474 14.2185C4.12878 13.8625 4.13947 13.2747 4.50861 12.9056L6.0401 11.3741Z" />
      <path d="M5.25433 14.9882L9.49697 19.2309L7.96548 20.7624C7.59634 21.1315 7.00851 21.1422 6.65256 20.7862L3.69897 17.8326C3.34301 17.4767 3.3537 16.8889 3.72284 16.5197L5.25433 14.9882Z" />
      <path d="M14.0175 4.68573L19.7995 10.4677C20.1555 10.8237 20.1448 11.4115 19.7757 11.7807L18.2442 13.3122L11.1731 6.24109L12.7046 4.7096C13.0737 4.34046 13.6616 4.32977 14.0175 4.68573Z" />
      <path d="M17.6316 3.90008L20.5852 6.85367C20.9412 7.20963 20.9305 7.79746 20.5614 8.1666L19.0299 9.69808L14.7872 5.45544L16.3187 3.92396C16.6879 3.55482 17.2757 3.54413 17.6316 3.90008Z" />
      <path d="M19.4502 5.03516L21.3084 3.17698" />
      <path d="M9.66565 14.8196L14.1751 10.3101" stroke-linecap="round" />
      <path d="M2.97595 21.5094L5.00198 19.4834" />
    </svg>
  );
}
