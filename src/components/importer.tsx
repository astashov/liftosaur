import { Fragment, ComponentChildren, h, JSX } from "preact";
import { useRef } from "preact/compat";

interface IImporterProps {
  children: (onClick: () => void) => ComponentChildren;
  onFileSelect: (contents: string) => void;
}

export function Importer(props: IImporterProps): JSX.Element {
  const fileInput = useRef<HTMLInputElement>();

  return (
    <>
      <input
        className="hidden"
        type="file"
        ref={fileInput}
        onChange={() => {
          const file = fileInput.current.files?.[0];
          if (file != null) {
            const reader = new FileReader();
            reader.addEventListener("load", async (event) => {
              const result = event.target?.result;
              if (typeof result === "string") {
                props.onFileSelect(result);
              }
            });
            reader.readAsText(file);
          }
        }}
      />
      {props.children(() => {
        fileInput.current.click();
      })}
    </>
  );
}
