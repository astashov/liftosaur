import type { JSX, ReactNode } from "react";

interface IImporterProps {
  children: (onClick: () => void) => ReactNode;
  onRawFile?: (file: unknown) => void;
  onFileSelect?: (contents: string) => void;
}

export function Importer(props: IImporterProps): JSX.Element {
  return <>{props.children(() => undefined)}</>;
}
