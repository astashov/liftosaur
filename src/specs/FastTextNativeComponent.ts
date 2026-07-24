/* eslint-disable @typescript-eslint/naming-convention */
import type { ViewProps, ColorValue } from "react-native";
import type { Int32, Float } from "react-native/Libraries/Types/CodegenTypes";
import codegenNativeComponent from "react-native/Libraries/Utilities/codegenNativeComponent";

interface NativeFragment {
  start: Int32;
  end: Int32;
  color?: ColorValue;
  backgroundColor?: ColorValue;
  fontWeight?: string;
  fontSize?: Float;
  fontStyle?: string;
  textDecorationLine?: string;
}

export interface NativeProps extends ViewProps {
  text: string;
  color?: ColorValue;
  backgroundColor?: ColorValue;
  fontWeight?: string;
  fontStyle?: string;
  // Empty => the weight-based Poppins face mapping. Set => that family is used verbatim
  // (e.g. "Iosevka" for code blocks), bypassing the Poppins mapping.
  fontFamily?: string;
  fontSize?: Float;
  // NOT "paddingHorizontal"/"lineHeight": those are reserved RN ViewProps/text styles and
  // Yoga would apply them as real layout padding in addition to our custom handling.
  textPaddingHorizontal?: Float;
  textLineHeight?: Float;
  // 0 => unlimited; truncates with a tail ellipsis when bounded.
  numberOfLines?: Int32;
  textAlign?: string;
  textDecorationLine?: string;
  fragments?: ReadonlyArray<NativeFragment>;
}

export default codegenNativeComponent<NativeProps>("FastText");
