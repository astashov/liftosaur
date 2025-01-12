import { Svg, Circle } from "react-native-svg";

interface IProps {
  style?: { [key: string]: string | number };
  className?: string;
  color?: string;
}

export function IconKebab(props: IProps): JSX.Element {
  return (
    <Svg style={props.style} className={props.className} width="16" height="4" viewBox="0 0 16 4" fill="none">
      <Circle cx="8" cy="2" r="2" fill="#171718" />
      <Circle cx="2" cy="2" r="2" fill="#171718" />
      <Circle cx="14" cy="2" r="2" fill="#171718" />
    </Svg>
  );
}
