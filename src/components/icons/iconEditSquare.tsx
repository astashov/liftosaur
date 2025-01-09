import { Svg, Path } from "react-native-svg";

export function IconEditSquare(props: { className?: string }): JSX.Element {
  return (
    <Svg width="17" height="18" viewBox="0 0 17 18" className={props.className} fill="none">
      <Path
        d="M8.5 1.91663H2.25C1.55965 1.91663 1 2.47627 1 3.16663V15.6666C1 16.357 1.55965 16.9166 2.25 16.9166H14.75C15.4404 16.9166 16 16.357 16 15.6666V9.41663"
        stroke="black"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 7.74999V9.83332L10.5833 9.20832L16.1193 3.49378C16.6117 2.9855 16.5539 2.16227 15.9953 1.72779C15.5219 1.35961 14.8485 1.40154 14.4244 1.82558L8.5 7.74999Z"
        stroke="black"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
