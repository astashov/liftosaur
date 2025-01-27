import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  bgColor?: string;
}

export function IconCloseCircleOutline(props: IProps = {}): JSX.Element {
  const size = props.size ?? 20;
  const color = props.color ?? Tailwind.colors().blackv2;
  const bgColor = props.color ?? Tailwind.colors().grayv3[50];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="16" fill={bgColor} />
      <path
        d="M21.9081 21.4999C21.4635 21.9446 20.7425 21.9446 20.2978 21.4999L16.2721 17.4742L12.2463 21.4999C11.8017 21.9446 11.0807 21.9446 10.636 21.4999C10.1914 21.0553 10.1914 20.3343 10.636 19.8896L14.6618 15.8639L10.636 11.8381C10.1914 11.3935 10.1914 10.6725 10.636 10.2278C11.0807 9.78317 11.8017 9.78317 12.2463 10.2278L16.2721 14.2536L20.2978 10.2278C20.7425 9.78317 21.4635 9.78317 21.9081 10.2278C22.3528 10.6725 22.3528 11.3935 21.9081 11.8381L17.8824 15.8639L21.9081 19.8896C22.3528 20.3343 22.3528 21.0553 21.9081 21.4999Z"
        fill={color}
      />
    </svg>
  );
}
