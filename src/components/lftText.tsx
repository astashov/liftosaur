import { Text, TextProps } from "react-native";

export const LftText = (props: TextProps): JSX.Element => {
  let fontFamily = "Poppins-Regular";
  const style = props.style;
  if (style != null && typeof style === "object") {
    if ("fontWeight" in style && style.fontWeight === "bold") {
      fontFamily = "Poppins-Bold";
    } else if ("fontWeight" in style && style.fontWeight === "semibold") {
      fontFamily = "Poppins-SemiBold";
    } else if ("fontStyle" in style && style.fontStyle === "italic") {
      fontFamily = "Poppins-Italic";
    }
  }

  return (
    <Text {...props} style={[{ fontFamily }, props.style]}>
      {props.children}
    </Text>
  );
};
