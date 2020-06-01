import { h, ComponentChildren, JSX } from "preact";
import { IconClose } from "./iconClose";

interface IProps {
  children: ComponentChildren;
  shouldShowClose?: boolean;
  onClose?: () => void;
}

export function Modal(props: IProps): JSX.Element {
  return (
    <section className="absolute inset-0 z-20 flex items-center justify-center">
      <div data-name="overlay" className="absolute inset-0 bg-gray-400 opacity-50"></div>
      <div
        data-name="modal"
        className="relative flex flex-col px-4 py-6 bg-white rounded-lg shadow-lg"
        style={{ maxWidth: "85%", maxHeight: "90%" }}
      >
        <div className="h-full overflow-auto">{props.children}</div>
        {props.shouldShowClose && (
          <button onClick={props.onClose} className="absolute top-0 right-0 p-2">
            <IconClose />
          </button>
        )}
      </div>
    </section>
  );
}
