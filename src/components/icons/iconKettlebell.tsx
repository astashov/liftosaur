import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconKettlebell(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().blackv2;
  return (
    <svg
      width={size}
      height={size}
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.9835 15.0706C17.8905 13.7323 17.4037 12.5101 16.6515 11.5068L17.4535 7.69586C17.6664 6.60521 17.3936 5.48647 16.7051 4.62622C16.0167 3.76597 14.999 3.27271 13.9129 3.27271H9.08721C8.00104 3.27271 6.98331 3.76606 6.29496 4.62622C5.60662 5.48647 5.33365 6.60521 5.54662 7.69586L6.35257 11.5275C5.51628 12.6477 5 14.0311 5 15.5501C5 17.1555 5.56605 18.6151 6.49558 19.7586C7.01706 20.4002 7.82301 20.7273 8.63825 20.7273H14.3617C15.177 20.7273 15.9829 20.4002 16.5044 19.7586C17.434 18.6151 18 17.1556 18 15.5501C18 15.3889 17.9945 15.2289 17.9835 15.0706ZM14.6209 7.11515L14.104 9.76248C13.3047 9.40292 12.4289 9.18953 11.5 9.18953C10.5718 9.18953 9.69314 9.39567 8.89443 9.75463L8.37909 7.11515C8.32122 6.81685 8.44821 6.60303 8.52934 6.50197C8.60979 6.40082 8.79029 6.23108 9.08721 6.23108H13.9129C14.2098 6.23108 14.3904 6.40082 14.4707 6.50197C14.5519 6.60303 14.6787 6.81685 14.6209 7.11515Z"
        stroke={color}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
