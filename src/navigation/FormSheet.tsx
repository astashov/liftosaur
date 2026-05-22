import { JSX, ReactNode } from "react";

interface IProps {
  children: ReactNode;
}

export function FormSheet(props: IProps): JSX.Element {
  return <>{props.children}</>;
}
