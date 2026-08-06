import { JSX, ReactNode } from "react";

interface IProps {
  children: ReactNode;
  shouldShowClose?: boolean;
  fitContent?: boolean;
  shouldClose?: () => boolean | Promise<boolean>;
  onClose: () => void;
}

export function SheetScreenContainer(props: IProps): JSX.Element {
  return <>{props.children}</>;
}
