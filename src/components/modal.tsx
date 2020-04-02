import { h, ComponentChildren, JSX } from "preact";

export function Modal(props: { children: ComponentChildren }): JSX.Element {
  return (
    <section className="absolute inset-0 flex items-center justify-center">
      <div data-name="overlay" className="absolute inset-0 bg-gray-400 opacity-50"></div>
      <div data-name="modal" className="bg-white p-4 rounded-lg relative shadow-lg">
        {props.children}
      </div>
    </section>
  );
}
