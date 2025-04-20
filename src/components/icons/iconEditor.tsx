import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconEditor(props: IProps): JSX.Element {
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
        d="M5.94578 19.2283C4.58004 19.2283 3.47289 18.1496 3.47289 16.819V16.1734C3.47289 14.4517 2.53026 12.8609 1 12.0001C2.53026 11.1393 3.47289 9.54848 3.47289 7.82678V7.18124C3.47289 5.85056 4.58004 4.77185 5.94578 4.77185M18.0545 4.77167C19.4202 4.77167 20.5274 5.85047 20.5274 7.18105V7.8266C20.5274 9.5483 21.47 11.1392 23.0002 11.9999C21.47 12.8607 20.5274 14.4515 20.5274 16.1732V16.8188C20.5274 18.1494 19.4202 19.2282 18.0545 19.2282M17.834 12H18.7316M9.75591 12H14.2437M5.26823 12H6.1658M8.14028 9.34963H9.7559V14.6504H8.14028C7.54582 14.6504 7.0632 14.1754 7.0632 13.5903V10.4098C7.0632 9.82467 7.54582 9.34963 8.14028 9.34963ZM15.8597 14.6504H14.2441V9.34963H15.8597C16.4542 9.34963 16.9368 9.82467 16.9368 10.4098V13.5903C16.9368 14.1754 16.4542 14.6504 15.8597 14.6504Z"
        stroke={color}
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
