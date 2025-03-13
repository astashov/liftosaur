import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconShare(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().blackv2;
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
      <path d="M5 13.6306V17.7714C5 18.2395 5.18437 18.6883 5.51256 19.0193C5.84075 19.3502 6.28587 19.5361 6.75 19.5361H17.25C17.7141 19.5361 18.1592 19.3502 18.4874 19.0193C18.8156 18.6883 19 18.2395 19 17.7714V13.6306M12.0361 15.5165L12.0361 4.46387M12.0361 4.46387L8.03613 8.28483M12.0361 4.46387L16.0361 8.28483" />
    </svg>
  );
}
