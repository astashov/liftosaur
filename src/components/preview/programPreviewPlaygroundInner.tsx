import { JSX, ReactNode } from "react";
import { IScrollableTabsProps, ScrollableTabs } from "../scrollableTabs";

export interface IProgramPreviewPlaygroundInnerRendererProps {
  headerContent?: ReactNode;
  weekNames: string[];
  singleWeek: boolean;
  renderWeekContent: (weekIndex: number) => JSX.Element;
  scrollableTabsProps?: Partial<IScrollableTabsProps>;
  hasNavbar?: boolean;
  scrollTabZIndex?: number;
}

export function ProgramPreviewPlaygroundInnerRenderer(props: IProgramPreviewPlaygroundInnerRendererProps): JSX.Element {
  return (
    <ScrollableTabs
      headerContent={props.headerContent}
      offsetY={props.scrollableTabsProps?.offsetY ?? (props.hasNavbar ? "3rem" : undefined)}
      zIndex={props.scrollTabZIndex}
      shouldNotExpand={true}
      color="purple"
      type={props.scrollableTabsProps?.type}
      topPadding={props.scrollableTabsProps?.topPadding}
      className={props.scrollableTabsProps?.className}
      nonSticky={props.scrollableTabsProps?.nonSticky}
      tabs={props.weekNames.map((name, weekIndex) => ({
        label: name,
        children: () => props.renderWeekContent(weekIndex),
      }))}
    />
  );
}
