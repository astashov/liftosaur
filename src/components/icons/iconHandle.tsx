import { Svg, Path } from "react-native-svg";

export function IconHandle(): JSX.Element {
  return (
    <Svg width="20" height="20" viewBox="0 0 20 20">
      <Path
        fill="#212B36"
        d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2m0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8m0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14m6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6m0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8m0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14"
      />
    </Svg>
  );
}
