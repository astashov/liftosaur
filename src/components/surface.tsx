import { JSX, ReactNode, Ref, forwardRef } from "react";

interface IProps {
  navbar?: ReactNode;
  footer: ReactNode;
  addons?: ReactNode;
  children: ReactNode;
}

export const Surface = forwardRef((props: IProps, ref: Ref<HTMLElement>): JSX.Element => {
  return (
    <section className="h-full bg-background-default text-text-primary">
      {props.navbar}
      <section
        data-testid="screen"
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
