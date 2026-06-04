import { CSSProperties, JSX } from "react";
import { IFastTextProps, IFastTextStyle, StyledText_fragmentsToSpans } from "../../utils/styledText";

function fragmentCss(style?: IFastTextStyle): CSSProperties | undefined {
  if (style == null) {
    return undefined;
  }
  return {
    color: style.color as string | undefined,
    backgroundColor: style.backgroundColor as string | undefined,
    fontWeight: style.fontWeight,
    fontSize: style.fontSize != null ? style.fontSize : undefined,
    fontStyle: style.fontStyle,
  };
}

export function FastText(props: IFastTextProps): JSX.Element {
  const spans = StyledText_fragmentsToSpans(props.text, props.fragments);
  // Base color/fontSize/fontWeight/fontStyle inherit via CSS; backgroundColor does not.
  const baseStyle: CSSProperties = {
    color: props.color as string | undefined,
    backgroundColor: props.backgroundColor as string | undefined,
    fontWeight: props.fontWeight,
    fontSize: props.fontSize != null ? props.fontSize : undefined,
    fontStyle: props.fontStyle,
    paddingLeft: props.paddingHorizontal,
    paddingRight: props.paddingHorizontal,
    lineHeight: props.lineHeight != null ? `${props.lineHeight}px` : undefined,
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
