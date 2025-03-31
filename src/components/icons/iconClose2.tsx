import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconClose2(props: IProps): JSX.Element {
  const size = props.size ?? 12;
  const color = props.color ?? Tailwind.colors().blackv2;
  return (
    <svg
      width={size}
      height={size}
      className={props.className}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.87472 9.87485C9.56901 10.1806 9.07335 10.1806 8.76764 9.87485L5.99994 7.10714L3.23224 9.87485C2.92653 10.1806 2.43087 10.1806 2.12516 9.87485C1.81945 9.56913 1.81945 9.07348 2.12516 8.76776L4.89286 6.00006L2.12516 3.23236C1.81945 2.92665 1.81945 2.43099 2.12516 2.12528C2.43087 1.81957 2.92653 1.81957 3.23224 2.12528L5.99994 4.89298L8.76764 2.12528C9.07335 1.81957 9.56901 1.81957 9.87472 2.12528C10.1804 2.43099 10.1804 2.92665 9.87472 3.23236L7.10702 6.00006L9.87472 8.76777C10.1804 9.07348 10.1804 9.56913 9.87472 9.87485Z"
        fill={color}
      />
    </svg>
  );
}
