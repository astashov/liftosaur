import { JSX, ReactNode, Ref } from "react";

export function NavScreenContent(props: { children: ReactNode; scrollRef?: Ref<HTMLDivElement> }): JSX.Element {
  return (
    <div ref={props.scrollRef} style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>
      {props.children}
    </div>
  );
}
