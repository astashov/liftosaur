import Svg, { Path, G, Defs, ClipPath, Rect } from "react-native-svg";
import { UidFactory } from "../../utils/generator";

interface IIconGraphsEProps {
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function IconGraphsE(props: IIconGraphsEProps): JSX.Element {
  const width = props.width || 20;
  const height = props.height || 27;
  const color = props.color || "#3C5063";
  const id = UidFactory.generateUid(8);
  return (
    <Svg className={props.className} width={width} height={height} viewBox="0 0 20 27" fill="none">
      <Path
        d="M9.56288 1.64587V3.3518H12.0819V4.9376H9.56288V6.7877H12.4119V8.43357H7.68188V0H12.4119V1.64587H9.56288Z"
        fill={color}
      />
      <G clipPath={`url(#${id})`}>
        <Path d="M0.833252 6.06714V26.0898H19.1666" stroke={color} strokeLinecap="round" strokeLinejoin="round" />
        <Path
          d="M0.833252 24.2696L7.49992 16.9886L11.4583 21.3117L19.1666 12.8931"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M0.833252 17.4437L7.49992 10.1627L11.4583 14.4858L19.1666 6.06714"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
      <Defs>
        <ClipPath id={id}>
          <Rect width="20" height="21.843" fill="white" transform="translate(0 5.15698)" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}
