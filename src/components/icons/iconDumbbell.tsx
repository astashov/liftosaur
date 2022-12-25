import { h, JSX } from "preact";

interface IProps {
  style?: { [key: string]: string | number };
  className?: string;
  color?: string;
  width?: number;
  height?: number;
}

export function IconDumbbell(props: IProps): JSX.Element {
  const width = props.width || 32;
  const height = props.height || 21;
  const color = props.color || "#3C5063";
  return (
    <svg
      style={props.style}
      className={`inline-block ${props.className}`}
      width={width}
      height={height}
      viewBox="0 0 32 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9.09267 8.46919L22.7291 8.46919M22.7291 13.0846L9.09272 13.0846" stroke={color} />
      <path
        d="M9.09286 6.16169C9.09286 4.88719 8.17708 3.854 7.04741 3.854C5.91773 3.854 5.00195 4.88719 5.00195 6.16169L5.00195 15.3924C5.00195 16.667 5.91773 17.7001 7.04741 17.7001C8.17708 17.7001 9.09286 16.667 9.09286 15.3924L9.09286 6.16169Z"
        stroke={color}
      />
      <path
        d="M5.00156 8.46882C5.00156 7.19432 4.08577 6.16113 2.9561 6.16113C1.82643 6.16113 0.910644 7.19432 0.910644 8.46882L0.910644 13.0842C0.910643 14.3587 1.82643 15.3919 2.9561 15.3919C4.08577 15.3919 5.00156 14.3587 5.00156 13.0842L5.00156 8.46882Z"
        stroke={color}
      />
      <path
        d="M30.9105 8.46882C30.9105 7.19432 29.9947 6.16113 28.865 6.16113C27.7354 6.16113 26.8196 7.19432 26.8196 8.46882L26.8196 13.0842C26.8196 14.3587 27.7354 15.3919 28.865 15.3919C29.9947 15.3919 30.9105 14.3587 30.9105 13.0842L30.9105 8.46882Z"
        stroke={color}
      />
      <path
        d="M26.8199 6.16169C26.8199 4.88719 25.9041 3.854 24.7745 3.854C23.6448 3.854 22.729 4.88719 22.729 6.16169L22.729 15.3924C22.729 16.667 23.6448 17.7001 24.7745 17.7001C25.9041 17.7001 26.8199 16.667 26.8199 15.3925L26.8199 6.16169Z"
        stroke={color}
      />
    </svg>
  );
}
