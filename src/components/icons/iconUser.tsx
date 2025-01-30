import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  style?: { [key: string]: string | number };
  size?: number;
  className?: string;
  color?: string;
}

export function IconUser(props: IProps): JSX.Element {
  const color = props.color || Tailwind.colors().grayv3[800];
  const size = props.size || 24;
  return (
    <svg
      style={props.style}
      className={`inline-block ${props.className}`}
      width={size}
      height={size}
      viewBox="0 0 21 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.1641 12.6744C12.2438 12.6744 13.9297 10.9885 13.9297 8.9088C13.9297 6.8291 12.244 5.1432 10.1641 5.1432C8.0842 5.1432 6.3984 6.8291 6.3984 8.9088C6.3984 10.9885 8.0844 12.6744 10.1641 12.6744ZM10.1641 12.6744C7.2483 12.6744 4.8486 14.8837 4.5474 17.7197M10.1641 12.6744C13.0799 12.6744 15.4796 14.8839 15.7807 17.7198M19.5781 10.1641C19.5781 15.3634 15.3633 19.5782 10.164 19.5782C4.9647 19.5782 0.75 15.3633 0.75 10.1641C0.75 4.9649 4.9647 0.75 10.1641 0.75C15.3635 0.75 19.5781 4.9647 19.5781 10.1641Z"
        stroke={color}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
