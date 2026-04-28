import React, { JSX, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconCloseCircleOutline } from "../components/icons/iconCloseCircleOutline";

export function SheetDragHandle(props: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}): JSX.Element {
  return (
    <div className={props.className} style={props.style}>
      {props.children}
    </div>
  );
}

interface IProps {
  children: ReactNode;
  shouldShowClose?: boolean;
  onClose: () => void;
}

export function SheetScreenContainer(props: IProps): JSX.Element {
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(props.onClose);
  onCloseRef.current = props.onClose;

  useEffect(() => {
    setContainerRef(document.getElementById("bottomsheet"));
    document.body.classList.add("stop-scrolling-bottom-sheet");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
    return () => {
      document.body.classList.remove("stop-scrolling-bottom-sheet");
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onCloseRef.current();
    }, 200);
  }, []);

  const bottomShift = isVisible ? 0 : (sheetRef.current?.clientHeight ?? 800);

  const element = (
    <div className="fixed inset-0 z-40">
      <div
        data-name="overlay"
        className={`absolute inset-0 bg-text-secondary will-change-transform ${
          isVisible ? "visible opacity-50" : "invisible opacity-0"
        }`}
        style={{ transition: "visibility 0.2s ease-out, opacity 0.2s ease-out" }}
        onClick={handleClose}
      ></div>
      <div
        ref={sheetRef}
        data-cy="bottom-sheet" data-testid="bottom-sheet" testID="bottom-sheet"
        className={`bottom-sticked absolute bottom-0 left-0 flex w-full overflow-y-auto bg-background-default will-change-transform ${
          isVisible ? "visible" : "invisible"
        }`}
        style={{
          transition: "transform 0.2s ease-out, visibility 0.2s",
          transform: `translateY(${bottomShift}px)`,
          borderRadius: "16px 16px 0 0",
          boxShadow: "0 -5px 15px rgb(0 0 0 / 30%)",
          maxHeight: "90vh",
        }}
      >
        {props.shouldShowClose && (
          <button
            data-cy="bottom-sheet-close" data-testid="bottom-sheet-close" testID="bottom-sheet-close"
            onClick={handleClose}
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
