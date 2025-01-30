import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  style?: { [key: string]: string | number };
  size?: number;
  color?: string;
}

export function IconHealth(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().blackv2;
  return (
    <svg
      width={size}
      className="inline-block"
      style={props.style}
      height={size}
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.3085 3H6.69142C4.65599 3 3 4.65599 3 6.69142V17.3086C3 19.344 4.65599 21 6.69142 21H17.3086C19.344 21 21 19.344 21 17.3086V6.69142C21 4.65599 19.3439 3 17.3085 3ZM14.82 12.6596C14.496 12.8747 14.0743 12.8747 13.7503 12.6596C11.8839 11.4205 10.4179 10.1146 10.4179 8.13276C10.4179 6.96781 11.3623 6.02336 12.5274 6.02336C13.2612 6.02336 13.9073 6.39829 14.2851 6.96691C14.663 6.39829 15.3091 6.02336 16.0429 6.02336C17.2079 6.02336 18.1523 6.96772 18.1523 8.13276C18.1523 10.1146 16.6865 11.4205 14.82 12.6596Z"
        stroke-miterlimit="10"
      />
    </svg>
  );
}
