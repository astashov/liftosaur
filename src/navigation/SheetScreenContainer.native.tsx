import { JSX, ReactNode } from "react";

interface IProps {
  children: ReactNode;
  shouldShowClose?: boolean;
  fitContent?: boolean;
  onClose: () => void;
}

export function SheetScreenContainer(props: IProps): JSX.Element {
  return <>{props.children}</>;
}
