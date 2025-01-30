import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IIconExternalLinkProps {
  className?: string;
  size?: number;
  color?: string;
}

export function IconExternalLink(props: IIconExternalLinkProps): JSX.Element {
  const color = props.color || Tailwind.colors().blackv2;
  const size = props.size || 12;
  return (
    <svg
      className={props.className}
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.6667 10.6667H1.33333V1.33333H6V0H1.33333C0.593333 0 0 0.6 0 1.33333V10.6667C0 11.4 0.593333 12 1.33333 12H10.6667C11.4 12 12 11.4 12 10.6667V6H10.6667V10.6667ZM7.33333 0V1.33333H9.72667L3.17333 7.88667L4.11333 8.82667L10.6667 2.27333V4.66667H12V0H7.33333Z"
        fill={color}
      />
    </svg>
  );
}
