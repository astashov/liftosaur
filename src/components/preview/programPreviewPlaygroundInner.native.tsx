import { JSX } from "react";
import { CollapsiblePreview } from "./programPreviewPlaygroundCollapsible";
import type { IProgramPreviewPlaygroundInnerRendererProps } from "./programPreviewPlaygroundInner";

export { type IProgramPreviewPlaygroundInnerRendererProps } from "./programPreviewPlaygroundInner";

export function ProgramPreviewPlaygroundInnerRenderer(
  props: IProgramPreviewPlaygroundInnerRendererProps
): JSX.Element {
  return (
    <CollapsiblePreview
      headerContent={props.headerContent}
      weekNames={props.weekNames}
      singleWeek={props.singleWeek}
      renderWeekContent={props.renderWeekContent}
    />
  );
}
