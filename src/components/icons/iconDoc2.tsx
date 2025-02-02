import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IInnerProps {
  size?: number;
  color?: string;
  bgColor?: string;
  className?: string;
}

interface IProps extends IInnerProps {
  isSelected?: boolean;
}

export function IconDoc2(props: IProps): JSX.Element {
  const { isSelected, ...rest } = props;
  return isSelected ? <IconDoc2Selected {...rest} /> : <IconDoc2Unselected {...rest} />;
}

export function IconDoc2Unselected(props: IInnerProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().blackv2;
  return (
    <svg
      width={size}
      stroke={color}
      height={size}
      className={props.className}
      viewBox="0 0 23 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19 7L15 3H12H5V12V21H12H19V14V7Z" stroke-width="1.5" stroke-linejoin="round" />
      <path
        d="M14 3V4C14 5.88562 14 6.82843 14.5858 7.41421C15.1716 8 16.1144 8 18 8H19"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <path d="M9 12L15 12" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M9 16L13 16" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

function IconDoc2Selected(props: IInnerProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().purplev3.main;
  const bgColor = props.bgColor ?? Tailwind.colors().white;
  return (
    <svg
      width={size}
      stroke={color}
      height={size}
      className={props.className}
      viewBox="0 0 23 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19 7L15 3H12H5V12V21H12H19V14V7Z"
        fill={color}
        stroke={color}
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <path d="M14 4V3L19 8H18C16.1144 8 15.1716 8 14.5858 7.41421C14 6.82843 14 5.88562 14 4Z" fill={bgColor} />
      <path d="M9 12L15 12" stroke={bgColor} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M9 16L13 16" stroke={bgColor} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}
