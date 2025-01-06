import { Svg, Path } from "react-native-svg";

interface IProps {
  style?: { [key: string]: string | number };
  className?: string;
  color?: string;
}

export function IconArrowDown2(props: IProps): JSX.Element {
  return (
    <Svg style={props.style} className={props.className} width="13" height="8" viewBox="0 0 13 8" fill="none">
      <Path
        d="M11.5 1.5L6.5 6.5L1.5 1.5"
        stroke={props.color || "#818385"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
