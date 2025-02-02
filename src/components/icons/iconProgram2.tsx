import { h, JSX } from "preact";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconProgram2(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? "#171718";
  return (
    <svg width={size} height={size} stroke={color} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 5L13 1H10H3V10V19H10H17V12V5Z" stroke-width="2" stroke-linejoin="round" />
      <path
        d="M12 1V2C12 3.88562 12 4.82843 12.5858 5.41421C13.1716 6 14.1144 6 16 6H17"
        stroke-width="2"
        stroke-linejoin="round"
      />
      <path d="M6 10L14 10" stroke-width="2" stroke-linejoin="round" />
      <path d="M6 14L12 14" stroke-width="2" stroke-linejoin="round" />
    </svg>
  );
}
