import { JSX, ReactNode } from "react";

export function NavScreenContent(props: { children: ReactNode }): JSX.Element {
  return (
    <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>
      {props.children}
    </div>
  );
}
