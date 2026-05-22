import { JSX, ReactNode } from "react";

interface IProps {
  children: ReactNode;
  noPadding?: boolean;
}

export function FormSheet(props: IProps): JSX.Element {
  return (
    <div className={`overflow-auto ${props.noPadding ? "" : "px-4 py-6"}`} style={{ maxHeight: "85vh" }}>
      {props.children}
    </div>
  );
}
