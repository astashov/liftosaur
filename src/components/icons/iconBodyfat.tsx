import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
}

export function IconBodyfat(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().blackv2;
  return (
    <svg
      width={size}
      className="inline-block"
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.5"
      stroke={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.5546 12.5612L17.9681 13.8159C18.8269 16.4218 17.9975 19.3867 15.7281 20.9287C14.697 21.6292 13.4521 22.0386 12.1117 22.0386C11.8893 22.0386 11.6695 22.0273 11.4529 22.0053C7.45311 21.5991 5.04881 17.3121 6.41431 13.5307L6.7494 12.6027M6.45849 8.9032C6.45849 8.9032 4.00359 13.2262 9.11649 12.4364M17.5273 8.9032C17.5273 8.9032 19.9822 13.2262 14.8693 12.4364M12.0172 19.6277H12.3121M10.1868 1.58728C10.1868 2.60708 9.61309 3.54018 8.70309 4.00038L7.40279 4.42168C4.83579 5.25348 3.23999 7.48668 2.88569 10.1617L2.55109 14.972M13.8679 1.58728C13.8679 2.60708 14.4416 3.54018 15.3516 4.00038L16.6519 4.42168C19.2189 5.25348 20.7601 7.48668 21.1144 10.1617L21.449 14.972M6.12592 16.7595V22.4127M18.3052 15.9697V22.4127"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
