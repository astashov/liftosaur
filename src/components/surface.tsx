import { JSX, ReactNode, Ref, forwardRef } from "react";
import { ReactNativeUtils_isWebViewMode } from "../utils/reactNative";

interface IProps {
  navbar?: ReactNode;
  footer: ReactNode;
  addons?: ReactNode;
  children: ReactNode;
}

export const Surface = forwardRef((props: IProps, ref: Ref<HTMLElement>): JSX.Element => {
  const showFooter = !ReactNativeUtils_isWebViewMode() && props.footer;
  return (
    <section className="h-full bg-background-default text-text-primary">
      {props.navbar}
      <section
        data-cy="screen"
        ref={ref}
        className={`surface ${props.navbar ? " pt-16" : ""}${showFooter ? " pb-16" : ""}`}
      >
        <div className="h-full safe-area-inset-bottom safe-area-inset-top">{props.children}</div>
      </section>
      {showFooter ? props.footer : undefined}
      {props.addons}
    </section>
  );
});
