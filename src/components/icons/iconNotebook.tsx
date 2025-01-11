import { Svg, Path } from "react-native-svg";

interface IProps {
  style?: { [key: string]: string | number };
  size?: number;
  className?: string;
  color?: string;
}

export function IconNotebook(props: IProps): JSX.Element {
  const color = props.color || "#3C5063";
  const width = props.size || 24;
  const height = props.size || 24;
  return (
    <Svg
      style={props.style}
      className={`inline-block ${props.className}`}
      width={width}
      height={height}
      viewBox="0 0 22 22"
      fill="none"
    >
      <Path
        d="M18.5 1H4.5C3.39543 1 2.5 1.89543 2.5 3V19C2.5 20.1046 3.39543 21 4.5 21H18.5C19.6046 21 20.5 20.1046 20.5 19V3C20.5 1.89543 19.6046 1 18.5 1Z"
        stroke={color}
        strokeWidth="2"
      />
      <Path d="M1.5 6H3.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M1.5 16H3.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7.5 7H15.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7.5 11H15.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7.5 15H15.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
