import { h, JSX, ComponentChildren } from "preact";
import { forwardRef, Ref } from "preact/compat";

interface IProps {
  navbar?: ComponentChildren;
  footer: ComponentChildren;
  addons?: ComponentChildren;
  children: ComponentChildren;
}

export const Surface = forwardRef((props: IProps, ref: Ref<HTMLElement>): JSX.Element => {
  return (
    <section className="h-full">
      {props.navbar}
      <section
        data-cy="screen"
        ref={ref}
        className={`surface ${props.navbar ? " pt-16" : ""}${props.footer ? " pb-16" : ""}`}
      >
        <div className="h-full safe-area-inset-bottom safe-area-inset-top">{props.children}</div>
      </section>
      {props.footer}
      {props.addons}
    </section>
  );
});
