import { h, ComponentChildren, JSX, RefObject } from "preact";
import { IconClose } from "./iconClose";
import { useRef, useEffect } from "preact/hooks";

interface IProps {
  children: ComponentChildren;
  autofocusInputRef?: RefObject<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
  isHidden?: boolean;
  isFullWidth?: boolean;
  shouldShowClose?: boolean;
  style?: Record<string, string | undefined>;
  onClose?: () => void;
}

export function Modal(props: IProps): JSX.Element {
  const modalRef = useRef<HTMLElement>();

  let className = "fixed inset-0 flex items-center justify-center";
  if (props.isHidden) {
    className += " invisible";
  }

  const prevProps = useRef<IProps>(props);
  useEffect(() => {
    prevProps.current = props;
  });

  if (
    modalRef.current != null &&
    props.autofocusInputRef?.current != null &&
    prevProps.current.isHidden &&
    !props.isHidden
  ) {
    modalRef.current.classList.remove("invisible");
    props.autofocusInputRef.current.focus();
  }

  return (
    <section ref={modalRef} className={className} style={{ zIndex: 100 }}>
      <div data-name="overlay" className="z- absolute inset-0 bg-gray-400 opacity-50"></div>
      <div
        data-name="modal"
        className="relative flex flex-col px-4 py-6 bg-white rounded-lg shadow-lg"
        style={{ maxWidth: "85%", maxHeight: "90%", width: props.isFullWidth ? "85%" : "auto", ...props.style }}
      >
        <div className="relative h-full overflow-auto">{props.children}</div>
        {props.shouldShowClose && (
          <button data-cy="modal-close" onClick={props.onClose} className="absolute top-0 right-0 p-2">
            <IconClose />
          </button>
        )}
      </div>
    </section>
  );
}
