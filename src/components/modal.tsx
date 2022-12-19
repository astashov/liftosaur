import { h, ComponentChildren, JSX, RefObject } from "preact";
import { useRef, useEffect } from "preact/hooks";
import { IconCloseCircleOutline } from "./icons/iconCloseCircleOutline";

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

  useEffect(() => {
    if (!props.isHidden) {
      document.body.classList.add("stop-scrolling");
    } else {
      document.body.classList.remove("stop-scrolling");
    }
    return () => {
      document.body.classList.remove("stop-scrolling");
    };
  }, [props.isHidden]);

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
      <div
        data-name="overlay"
        onClick={props.shouldShowClose ? props.onClose : undefined}
        className="absolute inset-0 z-10 overflow-scroll scrolling-touch opacity-50 bg-grayv2-700"
      ></div>
      <div
        data-name="modal"
        className="relative z-20 flex flex-col py-6 bg-white rounded-lg shadow-lg"
        style={{ maxWidth: "85%", maxHeight: "90%", width: props.isFullWidth ? "85%" : "auto", ...props.style }}
      >
        <div className="relative h-full px-6 overflow-auto">{props.children}</div>
        {props.shouldShowClose && (
          <button
            data-cy="modal-close"
            onClick={props.onClose}
            className="absolute p-2"
            style={{ top: "-3px", right: "-3px" }}
          >
            <IconCloseCircleOutline />
          </button>
        )}
      </div>
    </section>
  );
}
