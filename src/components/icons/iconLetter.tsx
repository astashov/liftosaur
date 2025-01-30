import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  style?: { [key: string]: string | number };
  size?: number;
  color?: string;
}

export function IconLetter(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().blackv2;
  return (
    <svg
      width={size}
      className="inline-block"
      style={props.style}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.5"
      stroke={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.58594 6.35194C2.58594 6.74394 2.78194 7.10994 3.10814 7.32724C4.70064 8.38914 9.49934 11.588 11.3038 12.7911C11.7254 13.0723 12.2748 13.0723 12.6964 12.7911C14.5007 11.588 19.2994 8.38914 20.8919 7.32724C21.2182 7.10974 21.414 6.74384 21.414 6.35194M2.58594 6.35194V6.35094C2.58594 5.65804 3.14764 5.09644 3.84054 5.09644H20.1594C20.8523 5.09644 21.414 5.65814 21.414 6.35094V6.35194M2.58594 6.35194V17.6484C2.58594 17.9813 2.71814 18.3006 2.95374 18.5358C3.18894 18.7713 3.50824 18.9037 3.84114 18.9036H20.1588C20.4917 18.9036 20.811 18.7714 21.0462 18.5358C21.2817 18.3006 21.4141 17.9813 21.414 17.6484V6.35194"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
