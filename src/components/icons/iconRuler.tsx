import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  style?: { [key: string]: string | number };
  size?: number;
  color?: string;
}

export function IconRuler(props: IProps): JSX.Element {
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
        d="M16.5417 9.275C16.5417 11.7833 13.0851 13.8166 8.82098 13.8166C4.5569 13.8166 1.10028 11.7833 1.10028 9.275M16.5417 9.275C16.5417 6.76675 13.085 4.7334 8.82098 4.7334C4.55694 4.7334 1.10028 6.76675 1.10028 9.275M16.5417 9.275L16.5415 13.8165M1.10028 9.275L1.10016 14.7242C1.10016 17.2328 4.49667 19.2664 8.68642 19.2664H22.8999M8.68642 13.8171H22.8999M22.8999 13.8171V19.2664M22.8999 13.8171L18.3584 13.8168V19.2667L22.8999 19.2664M11.0916 9.27489C11.0916 9.77654 10.0749 10.1832 8.8208 10.1832C7.56665 10.1832 6.55001 9.77654 6.55001 9.27489C6.55001 8.77324 7.56668 8.36656 8.8208 8.36656C10.0749 8.36656 11.0916 8.77324 11.0916 9.27489Z"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
