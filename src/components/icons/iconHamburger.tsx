import { h, JSX } from "preact";

interface IProps {
  style?: { [key: string]: string | number };
  className?: string;
  size?: number;
  color?: string;
}

export function IconHamburger(props: IProps): JSX.Element {
  const color = props.color ?? "#171718";
  const size = props.size ?? 22;
  return (
    <svg
      style={props.style}
      className={props.className}
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.57143 6.2H20.4286C21.296 6.2 22 5.4832 22 4.6C22 3.7168 21.296 3 20.4286 3H1.57143C0.704 3 0 3.7168 0 4.6C0 5.4832 0.704 6.2 1.57143 6.2ZM20.4286 9.4H1.57143C0.704 9.4 0 10.1168 0 11C0 11.8832 0.704 12.6 1.57143 12.6H20.4286C21.296 12.6 22 11.8832 22 11C22 10.1168 21.296 9.4 20.4286 9.4ZM20.4286 15.8H1.57143C0.704 15.8 0 16.5168 0 17.4C0 18.2832 0.704 19 1.57143 19H20.4286C21.296 19 22 18.2832 22 17.4C22 16.5168 21.296 15.8 20.4286 15.8Z"
        fill={color}
      />
    </svg>
  );
}
