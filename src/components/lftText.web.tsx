import { Text, TextProps } from "react-native";

export const LftText = (props: TextProps): JSX.Element => {
  return (
    <Text {...props} style={[{ fontFamily: "Poppins" }, props.style]}>
      {props.children}
    </Text>
  );
};
