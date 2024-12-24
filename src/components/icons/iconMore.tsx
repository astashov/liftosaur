import { h, JSX } from "preact";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconMore(props: IProps): JSX.Element {
  const size = props.size ?? 40;
  const color = props.color ?? "#171718";
  return (
    <svg width={size} height={size} viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20.816" cy="20.1991" r="20" fill="#EEEEEE" />
      <circle cx="12.816" cy="20.1991" r="2" fill={color} />
      <circle cx="20.816" cy="20.1991" r="2" fill={color} />
      <circle cx="28.816" cy="20.1991" r="2" fill={color} />
    </svg>
  );
}
