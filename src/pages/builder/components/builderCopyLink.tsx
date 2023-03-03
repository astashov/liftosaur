import { h, JSX } from "preact";
import { IconLink } from "../../../components/icons/iconLink";
import { useState } from "preact/compat";
import { Service } from "../../../api/service";
import { useEffect } from "preact/hooks";

interface IBuilerCopyLinkProps<T> {
  msg?: string;
  type: "p" | "b";
  program: T;
  client: Window["fetch"];
}

export function BuilderCopyLink<T>(props: IBuilerCopyLinkProps<T>): JSX.Element {
  const msg = props.msg || "Copied this workout link to clipboard";
  const [showInfo, setShowInfo] = useState<string | undefined>(undefined);

  useEffect(() => {
    setShowInfo(undefined);
  }, [props.program]);

  return (
    <div className="flex items-center text-right">
      {showInfo && (
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
          const url = await service.postShortUrl(window.location.href, props.type);
          navigator.permissions.query({ name: "clipboard-write" }).then((result) => {
            if (result.state === "granted" || result.state === "prompt") {
              navigator.clipboard.writeText(url);
              setShowInfo(url);
            }
          });
        }}
      >
        <IconLink />
      </button>
    </div>
  );
}
