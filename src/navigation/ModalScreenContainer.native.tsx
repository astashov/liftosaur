import { JSX, ReactNode } from "react";

interface IProps {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
  isFullWidth?: boolean;
  isFullHeight?: boolean;
  noPaddings?: boolean;
  overflowHidden?: boolean;
  innerClassName?: string;
  shouldShowClose?: boolean;
  zIndex?: number;
}

export function ModalScreenContainer(props: IProps): JSX.Element {
  return <>{props.children}</>;
}
