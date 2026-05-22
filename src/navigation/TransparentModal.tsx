import { JSX, ReactNode, CSSProperties } from "react";

interface IProps {
  children: ReactNode;
  onClose: () => void;
  fitContent?: boolean;
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
