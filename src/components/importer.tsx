import React, { JSX } from "react";
import { useRef } from "react";

interface IImporterProps {
  children: (onClick: () => void) => React.ReactNode;
  onFileSelect: (contents: string) => void;
}

export function Importer(props: IImporterProps): JSX.Element {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        className="hidden"
        type="file"
        ref={fileInput}
        onChange={() => {
          const file = fileInput.current!.files?.[0];
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
        fileInput.current!.click();
      })}
    </>
  );
}
