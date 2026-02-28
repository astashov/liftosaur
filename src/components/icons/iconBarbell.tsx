import { h, JSX } from "preact";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  color?: string;
}

export function IconBarbell(props: IProps): JSX.Element {
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <svg
      width="24"
      height="20"
      className="inline-block"
      viewBox="0 0 17 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5.44872 6.10254H0V7.62818H5.44872V6.10254Z" fill={color} />
      <path d="M8.2078 0H9.92114V13.7308H8.2078V0Z" fill={color} />
      <path d="M10.4142 1.42163H12.1275V12.3092H10.4142V1.42163Z" fill={color} />
      <path d="M12.6206 2.82593H14.3339V10.9049H12.6206V2.82593Z" fill={color} />
      <path d="M14.7886 6.11975V7.61072H15.8813H15.9073H17V6.11975H15.9073H15.8813H14.7886Z" fill={color} />
      <path d="M6.00144 0H7.71478V13.7308H6.00144V0Z" fill={color} />
    </svg>
  );
}
