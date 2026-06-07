import { JSX } from "react";
import { ColorValue, processColor } from "react-native";
import FastTextNative from "../../specs/FastTextNativeComponent";
import { IFastTextProps } from "../../utils/styledText";

// Codegen auto-runs processColor on top-level ColorValue props (via the view config), but
// NOT on nested struct/array fields, so fragment colors arrive at the native side as raw CSS
// strings. iOS's color fromRawValue only accepts an ARGB int (or component array / platform
// map), so pre-process here; Android's manager reads the resulting Number just as well.
function processFragmentColor(color: ColorValue | undefined): ColorValue | undefined {
  if (color == null) {
    return undefined;
  }
  const processed = processColor(color);
  return processed == null ? undefined : (processed as unknown as ColorValue);
}

export function FastText(props: IFastTextProps): JSX.Element {
  const fragments = (props.fragments ?? []).map((f) => ({
    start: f.start,
    end: f.end,
    color: processFragmentColor(f.color),
    backgroundColor: processFragmentColor(f.backgroundColor),
    fontWeight: f.fontWeight,
    fontSize: f.fontSize,
    fontStyle: f.fontStyle,
    textDecorationLine: f.textDecorationLine,
  }));
  const testID = props["data-testid"] ?? props["data-cy"] ?? props.testID;
  return (
    <FastTextNative
      text={props.text}
      color={props.color}
      backgroundColor={props.backgroundColor}
      fontWeight={props.fontWeight}
      fontStyle={props.fontStyle}
      fontSize={props.fontSize}
      textPaddingHorizontal={props.paddingHorizontal}
      textLineHeight={props.lineHeight}
      numberOfLines={props.numberOfLines}
      textAlign={props.textAlign}
      textDecorationLine={props.textDecorationLine}
      fragments={fragments}
      style={props.style}
      accessible={true}
      accessibilityLabel={props.accessibilityLabel ?? props.text}
      testID={testID}
    />
  );
}
