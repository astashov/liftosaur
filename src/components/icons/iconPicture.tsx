import { h, JSX } from "preact";

interface IProps {
  style?: { [key: string]: string | number };
  size?: number;
  className?: string;
  color?: string;
}

export function IconPicture(props: IProps): JSX.Element {
  const color = props.color || "#3C5063";
  const width = props.size || 24;
  const height = props.size || 24;
  return (
    <svg
      style={props.style}
      className={`inline-block ${props.className}`}
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 1.91992V22.0799H24V1.91992H0ZM0.96 2.87992H23.04V21.1199H0.96V2.87992ZM1.92 3.83992V14.7749C1.90687 14.8387 1.90687 14.9062 1.92 14.9699V20.1599H22.08V17.8349C22.0931 17.7712 22.0931 17.7037 22.08 17.6399V3.83992H1.92ZM2.88 4.79992H21.12V16.5899L16.665 12.1349C16.5581 12.0299 16.4081 11.9793 16.26 11.9999C16.1531 12.0112 16.0519 12.0599 15.975 12.1349L13.935 14.1749L9 8.78992C8.88937 8.66992 8.72625 8.6118 8.565 8.63992C8.46937 8.65305 8.38125 8.69617 8.31 8.75992L2.88 13.7699V4.79992ZM16.8 7.19992C16.005 7.19992 15.36 7.84492 15.36 8.63992C15.36 9.43492 16.005 10.0799 16.8 10.0799C17.595 10.0799 18.24 9.43492 18.24 8.63992C18.24 7.84492 17.595 7.19992 16.8 7.19992ZM8.61 9.80992L13.245 14.8649L12.135 15.9749C11.9437 16.1662 11.9437 16.4737 12.135 16.6649C12.3262 16.8562 12.6337 16.8562 12.825 16.6649L14.19 15.2849C14.2575 15.2437 14.3137 15.1874 14.355 15.1199L16.32 13.1699L21.12 17.9699V19.1999H2.88V15.1049L8.61 9.80992Z"
        fill={color}
      />
    </svg>
  );
}
