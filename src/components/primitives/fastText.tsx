import { CSSProperties, JSX } from "react";
import { IFastTextProps, IFastTextStyle, StyledText_fragmentsToSpans } from "../../utils/styledText";

function fragmentCss(style?: IFastTextStyle): CSSProperties | undefined {
  if (style == null) {
    return undefined;
  }
  return {
    color: style.color as string | undefined,
    backgroundColor: style.backgroundColor as string | undefined,
    fontWeight: normalizeFontWeight(style.fontWeight),
    fontSize: style.fontSize != null ? style.fontSize : undefined,
    fontStyle: style.fontStyle,
    textDecorationLine: style.textDecorationLine,
  };
}

// fonts.css only declares Poppins 400/600/700; CSS matching would resolve 500 down to 400,
// while the native renderers map 500-699 to the SemiBold face — normalize to match them.
function normalizeFontWeight(fontWeight: IFastTextStyle["fontWeight"]): string | undefined {
  return fontWeight === "500" ? "600" : fontWeight;
}

function numberOfLinesCss(numberOfLines: number | undefined): CSSProperties | undefined {
  if (numberOfLines == null || numberOfLines <= 0) {
    return undefined;
  }
  if (numberOfLines === 1) {
    return { display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  }
  return {
    display: "-webkit-box",
    WebkitLineClamp: numberOfLines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
}

export function FastText(props: IFastTextProps): JSX.Element {
  const spans = StyledText_fragmentsToSpans(props.text, props.fragments);
  // Base color/fontSize/fontWeight/fontStyle inherit via CSS; backgroundColor does not.
  const baseStyle: CSSProperties = {
    color: props.color as string | undefined,
    backgroundColor: props.backgroundColor as string | undefined,
    fontWeight: normalizeFontWeight(props.fontWeight),
    fontSize: props.fontSize != null ? props.fontSize : undefined,
    fontStyle: props.fontStyle,
    textDecorationLine: props.textDecorationLine,
    paddingLeft: props.paddingHorizontal,
    paddingRight: props.paddingHorizontal,
    lineHeight: props.lineHeight != null ? `${props.lineHeight}px` : undefined,
    // textAlign only takes effect on a block-level box (an inline span shrinks to content).
    ...(props.textAlign != null ? { display: "block", textAlign: props.textAlign } : undefined),
    ...numberOfLinesCss(props.numberOfLines),
    ...(props.style as CSSProperties),
  };
  const topTestId = props["data-testid"] ?? props.testID;
  const topDataCy = props["data-cy"];
  return (
    <span style={baseStyle} aria-label={props.accessibilityLabel} data-testid={topTestId} data-cy={topDataCy}>
      {spans.map((span, i) =>
        span.style != null || span.testID != null ? (
          <span key={i} style={fragmentCss(span.style)} data-testid={span.testID} data-cy={span.testID}>
            {span.text}
          </span>
        ) : (
          <span key={i}>{span.text}</span>
        )
      )}
    </span>
  );
}
