import { JSX, ReactNode, CSSProperties } from "react";

interface IProps {
  children: ReactNode;
  onClose: () => void;
  shouldClose?: () => boolean | Promise<boolean>;
  fitContent?: boolean;
  // Native-only: sits in the sheet's bottom safe-area band; the web sheet has neither.
  safeAreaContent?: ReactNode;
}

export function TransparentModal(props: IProps): JSX.Element {
  return <>{props.children}</>;
}

export function SheetDragHandle(props: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}): JSX.Element {
  return (
    <div className={props.className} style={props.style}>
      {props.children}
    </div>
  );
}
