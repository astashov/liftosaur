import { h, JSX } from "preact";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  style?: { [key: string]: string | number };
  size?: number;
  className?: string;
  color?: string;
  secondaryColor?: string;
}

export function IconYoutube(props: IProps): JSX.Element {
  const size = props.size || 24;
  const color = props.color || Tailwind_semantic().icon.neutral;
  const secondaryColor = props.secondaryColor || Tailwind_semantic().icon.white;
  return (
    <svg
      width={size}
      height={size}
      className={props.className}
      style={props.style}
      viewBox="0 0 26 26"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24.9772 6.98253C24.6892 5.90623 23.8433 5.06041 22.767 4.77229C20.8182 4.24957 13 4.24957 13 4.24957C13 4.24957 5.18183 4.24957 3.23295 4.77229C2.15665 5.06041 1.31083 5.90623 1.02272 6.98253C0.5 8.93141 0.5 13 0.5 13C0.5 13 0.5 17.0686 1.02272 19.0175C1.31083 20.0938 2.15665 20.9396 3.23295 21.2276C5.18183 21.7504 13 21.7504 13 21.7504C13 21.7504 20.8182 21.7504 22.767 21.2276C23.8433 20.9396 24.6892 20.0938 24.9772 19.0175C25.5 17.0686 25.5 13 25.5 13C25.5 13 25.4979 8.93141 24.9772 6.98253Z"
        fill={color}
      />
      <path d="M10.4978 16.7499L16.9927 13.0003L10.4978 9.25073V16.7499Z" fill={secondaryColor} />
    </svg>
  );
}
