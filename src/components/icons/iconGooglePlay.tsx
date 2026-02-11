import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconGooglePlay(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.semantic().icon.neutral;
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
        d="M12.6225 12.75L3.17246 3.5775C3.05288 3.82352 2.99374 4.09453 2.99996 4.368V21.135C2.99996 21.456 3.06596 21.723 3.17846 21.936L12.6225 12.75ZM13.17 12.219L16.08 9.3885L4.98296 3.258C4.71764 3.09893 4.41614 3.01014 4.10696 3C3.98064 2.99976 3.85526 3.02159 3.73646 3.0645L13.17 12.219ZM20.184 11.6565L16.782 9.777L13.722 12.7545L16.782 15.7245L20.184 13.8435C21.273 13.2435 21.273 12.258 20.184 11.6565ZM13.176 13.287L3.76346 22.4445C4.09946 22.5555 4.52096 22.503 4.98296 22.2495L16.086 16.11L13.176 13.287Z"
        fill={color}
      />
    </svg>
  );
}
