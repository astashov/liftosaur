import { JSX } from "react";
import { ColorValue, PixelRatio, processColor } from "react-native";
import FastTextNative from "../../specs/FastTextNativeComponent";
import { IFastTextProps } from "../../utils/styledText";

// The native FastText renderers draw text directly instead of using <Text>, so unlike RN's
// <Text> (allowFontScaling defaults to true) they don't pick up the OS font-size setting.
// Apply it here, the single choke point that feeds both the render and measure native paths,
// so FastText scales with the system font size the same way the <Text> trees it replaced did.
function scaleFontSize(size: number | undefined): number | undefined {
  return size == null ? size : size * PixelRatio.getFontScale();
}

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
    fontSize: scaleFontSize(f.fontSize),
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
      fontFamily={props.fontFamily}
      fontSize={scaleFontSize(props.fontSize)}
      textPaddingHorizontal={props.paddingHorizontal}
      textLineHeight={scaleFontSize(props.lineHeight)}
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
