import React, { JSX } from "react";
import { forwardRef, Ref } from "react";

interface IProps {
  navbar: React.ReactNode;
  footer: React.ReactNode;
  addons?: React.ReactNode;
  children: React.ReactNode;
}

export const Surface = forwardRef(
  (props: IProps, ref: Ref<HTMLElement>): JSX.Element => {
    return (
      <section className="h-full">
        {props.navbar}
        <section data-cy="screen" ref={ref} className="py-16">
          <div className="safe-area-inset-bottom safe-area-inset-top">{props.children}</div>
        </section>
        {props.footer}
        {props.addons}
      </section>
    );
  }
);
