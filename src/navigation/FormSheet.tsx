import { JSX, ReactNode } from "react";

interface IProps {
  children: ReactNode;
  header?: ReactNode;
  noPadding?: boolean;
}

export function FormSheet(props: IProps): JSX.Element {
  const hasHeader = props.header != null;
  const scrollPadding = props.noPadding ? "" : ["px-4", hasHeader ? "" : "pt-6", "pb-6"].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col" style={{ maxHeight: "85vh" }}>
      {hasHeader && <div className="shrink-0">{props.header}</div>}
      <div className={`overflow-y-auto min-h-0 ${scrollPadding}`} style={{ flex: "0 1 auto" }}>
        {props.children}
      </div>
    </div>
  );
}
