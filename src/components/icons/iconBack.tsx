import Svg, { Path } from "react-native-svg";

interface IProps {
  style?: { [key: string]: string | number };
  color?: string;
}

export function IconBack(props: IProps): JSX.Element {
  const color = props.color || "#171718";
  return (
    <Svg style={props.style} width="15" height="22" viewBox="0 0 15 22" fill="none">
      <Path d="M13 2L3 10.9041L13 20" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}
