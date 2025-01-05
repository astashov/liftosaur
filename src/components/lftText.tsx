import { Text, TextProps } from "react-native";

export const LftText = (props: TextProps): JSX.Element => {
  const fontFamily = "Poppins";
  return (
    <Text {...props} style={[{ fontFamily }, props.style]}>
      {props.children}
    </Text>
  );
};
