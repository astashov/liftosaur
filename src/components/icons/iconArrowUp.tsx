import { Svg, Path } from "react-native-svg";

interface IProps {
  style?: { [key: string]: string | number };
  className?: string;
  color?: string;
}

export function IconArrowUp(props: IProps): JSX.Element {
  return (
    <Svg style={props.style} className={props.className} width="13" height="8" viewBox="0 0 13 8" fill="none">
      <Path
        d="M1.5 6.5L6.5 1.5L11.5 6.5"
        stroke={props.color || "#818385"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
