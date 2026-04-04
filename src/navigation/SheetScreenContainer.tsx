import { JSX, ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconCloseCircleOutline } from "../components/icons/iconCloseCircleOutline";

interface IProps {
  children: ReactNode;
  shouldShowClose?: boolean;
  onClose: () => void;
}

export function SheetScreenContainer(props: IProps): JSX.Element {
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainerRef(document.getElementById("bottomsheet"));
    document.body.classList.add("stop-scrolling-bottom-sheet");
    return () => {
      document.body.classList.remove("stop-scrolling-bottom-sheet");
    };
  }, []);

  const element = (
    <div className="fixed inset-0 z-40">
      <div data-name="overlay" className="absolute inset-0 opacity-50 bg-text-secondary" onClick={props.onClose}></div>
      <div
        className="bottom-sticked absolute bottom-0 left-0 flex w-full overflow-y-auto bg-background-default"
        style={{
          borderRadius: "16px 16px 0 0",
          boxShadow: "0 -5px 15px rgb(0 0 0 / 30%)",
          maxHeight: "90vh",
        }}
      >
        <div
          className="absolute top-1 left-1 px-1 text-xs font-bold rounded bg-purple-500 text-white opacity-50"
          style={{ fontSize: "8px", zIndex: 100 }}
        >
          NAV
        </div>
        {props.shouldShowClose && (
          <button
            data-cy="bottom-sheet-close"
            onClick={props.onClose}
            className="absolute top-0 right-0 z-20 p-2 nm-bottom-sheet-close"
          >
            <IconCloseCircleOutline size={28} />
          </button>
        )}
        <div className="flex flex-col w-full safe-area-inset-bottom" style={{ maxHeight: "90vh" }}>
          <div className="z-10 flex items-center justify-center pt-2 bg-background-default">
            <div className="w-8 rounded-sm bg-text-disabled" style={{ height: "3px" }} />
          </div>
          {props.children}
        </div>
      </div>
    </div>
  );

  if (!containerRef) {
    return <></>;
  }
  return createPortal(element, containerRef);
}
