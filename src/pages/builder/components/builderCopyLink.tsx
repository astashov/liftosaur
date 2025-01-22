import { h, JSX } from "preact";
import { IconLink } from "../../../components/icons/iconLink";
import { useState } from "preact/compat";
import { Service } from "../../../api/service";
import { useEffect } from "preact/hooks";
import { ClipboardUtils } from "../../../utils/clipboard";

interface IBuilderCopyLinkProps<T> {
  msg?: string;
  rightAligned?: boolean;
  suppressShowInfo?: boolean;
  encodedProgram?: () => Promise<string>;
  onShowInfo?: (url: string) => void;
  type: "p" | "b" | "n";
  program: T;
  client: Window["fetch"];
  title?: string | JSX.Element;
}

export function BuilderCopyLink<T>(props: IBuilderCopyLinkProps<T>): JSX.Element {
  const msg = props.msg || "Copied this workout link to clipboard";
  const [showInfo, setShowInfo] = useState<string | undefined>(undefined);

  useEffect(() => {
    setShowInfo(undefined);
  }, [props.program]);

  return (
    <div className={`flex items-center text-right ${props.rightAligned ? "flex-row-reverse" : ""}`}>
      {showInfo && !props.suppressShowInfo && (
        <div className="mr-2 align-middle">
          <div>{msg} </div>
          <a className="font-bold underline text-bluev2" href={showInfo}>
            {showInfo}
          </a>
        </div>
      )}
      <button
        title="Copy link to clipboard"
        className="p-2 align-middle"
        onClick={async () => {
          const service = new Service(props.client);
          const encodedProgram = props.encodedProgram ? await props.encodedProgram() : window.location.href;
          const url = await service.postShortUrl(encodedProgram, props.type);
          ClipboardUtils.copy(url);
          if (props.onShowInfo) {
            props.onShowInfo(url);
          }
          setShowInfo(url);
        }}
      >
        <IconLink className="inline-block align-middle" />
        <span className="align-middle">{props.title}</span>
      </button>
    </div>
  );
}
