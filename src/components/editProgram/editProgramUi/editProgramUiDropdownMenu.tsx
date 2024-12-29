import React, { JSX } from "react";

export function DropdownMenu(props: { children: React.ReactNode; onClose: () => void }): JSX.Element {
  return (
    <section className="" style={{ zIndex: 100 }}>
      <div data-name="overlay" className="fixed inset-0 z-10 overflow-scroll scrolling-touch" onClick={props.onClose} />
      <div className={`absolute shadow rounded`} style={{ maxWidth: "12rem", top: "0", right: "2.5rem" }}>
        <div className={`relative h-full z-20 bg-white rounded p-2 text-right`}>{props.children}</div>
        <div className="add-tip" />
      </div>
    </section>
  );
}

interface IDropdownMenuItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  isTop?: boolean;
}

export function DropdownMenuItem(props: IDropdownMenuItemProps): JSX.Element {
  const { className, children, isTop, ...rest } = props;
  return (
    <button
      className={`block w-full px-2 text-right whitespace-no-wrap ${
        !isTop ? "pt-1 mt-1 border-t border-grayv2-50" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
