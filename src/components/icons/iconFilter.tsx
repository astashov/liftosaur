import { Svg, Circle, Path } from "react-native-svg";
interface IProps {
  size?: number;
  color?: string;
}

export function IconFilter(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? "#171718";
  return (
    <Svg width={size} className="inline-block" height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx="34" cy="9" r="5" stroke={color} strokeWidth="2" />
      <Circle r="5" transform="matrix(-1 0 0 1 14 24)" stroke={color} strokeWidth="2" />
      <Circle r="5" transform="matrix(1 0 0 -1 27 39)" stroke={color} strokeWidth="2" />
      <Path d="M3 9H21" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M3 24L9 24" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M43 39H32" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M3 39L13 39" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M39 9L45 9" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M43 24H27" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}
