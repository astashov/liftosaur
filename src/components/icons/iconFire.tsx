import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconFire(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().blackv2;
  return (
    <svg
      width={size}
      height={size}
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.17608 6.98208C5.35985 6.53496 5.90469 6.36484 6.31021 6.62796L7.61456 7.47427C8.66582 8.15638 10.0492 8.02017 10.9472 7.14613C11.6031 6.50777 11.8885 5.57916 11.7043 4.68263L11.1651 2.05901C10.9994 1.25239 11.9029 0.65652 12.5791 1.12656L16.6322 3.94422C18.6428 5.342 20.0391 7.45933 20.532 9.85799C20.8792 11.5475 20.8792 13.29 20.532 14.9796L20.3267 15.9789C19.9603 17.7615 19.0616 19.391 17.7492 20.6519C14.5375 23.7377 9.46244 23.7377 6.25068 20.6519C4.93833 19.391 4.03958 17.7615 3.67325 15.9789L3.55701 15.4132C3.15592 13.4614 3.34628 11.4343 4.10375 9.59125L5.17608 6.98208Z"
        fill={color}
      />
    </svg>
  );
}
