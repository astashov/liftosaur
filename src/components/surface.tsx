import { h, JSX, ComponentChildren } from "preact";

interface IProps {
  navbar: ComponentChildren;
  footer: ComponentChildren;
  addons?: ComponentChildren;
  children: ComponentChildren;
}

export function Surface(props: IProps): JSX.Element {
  return (
    <section className="h-full">
      {props.navbar}
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>{props.children}</section>
      {props.footer}
      {props.addons}
    </section>
  );
}
