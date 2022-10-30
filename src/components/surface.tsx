import { h, JSX, ComponentChildren } from "preact";
import { forwardRef, Ref } from "preact/compat";

interface IProps {
  navbar: ComponentChildren;
  footer: ComponentChildren;
  addons?: ComponentChildren;
  children: ComponentChildren;
}

export const Surface = forwardRef(
  (props: IProps, ref: Ref<HTMLElement>): JSX.Element => {
    return (
      <section className="h-full">
        {props.navbar}
        <section ref={ref} style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
          {props.children}
        </section>
        {props.footer}
        {props.addons}
      </section>
    );
  }
);
