import { ComponentChildren, JSX, h } from "preact";

export function DropdownMenu(props: { children: ComponentChildren; onClose: () => void }): JSX.Element {
  return (
    <section className="" style={{ zIndex: 100 }}>
      <div data-name="overlay" className="fixed inset-0 z-10 overflow-scroll scrolling-touch" onClick={props.onClose} />
      <div className={`absolute shadow rounded`} style={{ maxWidth: "12rem", top: "0", right: "2.5rem" }}>
        <div className={`relative h-full z-20 bg-white rounded p-2`}>{props.children}</div>
        <div className="add-tip" />
      </div>
    </section>
  );
}
