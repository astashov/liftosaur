import { Svg, Path } from "react-native-svg";

interface IProps {
  style?: { [key: string]: string | number };
  className?: string;
  color?: string;
  width?: number;
  height?: number;
}

export function IconArrowRight(props: IProps): JSX.Element {
  const width = props.width || 7;
  const height = props.height || 12;
  return (
    <Svg style={props.style} className={props.className} width={width} height={height} viewBox="0 0 7 12" fill="none">
      <Path
        d="M1 1L6 6L1 11"
        stroke={props.color || "#818385"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
