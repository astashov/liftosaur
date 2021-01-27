import { h, JSX } from "preact";
import { Modal } from "./modal";
import { Share } from "../models/share";
import { Button } from "./button";
import { useRef, useState, useEffect } from "preact/hooks";
import { ClipboardUtils } from "../utils/clipboard";

interface IProps {
  userId: string;
  id: number;
  onClose: () => void;
}

export function ModalShare(props: IProps): JSX.Element {
  const link = Share.generateLink(props.userId, props.id);
  const linkRef = useRef<HTMLDivElement>();
  const timerRef = useRef<number | undefined>(undefined);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isCopied) {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        setIsCopied(false);
        timerRef.current = undefined;
      }, 3000);
    }
  });

  return (
    <Modal shouldShowClose={true} onClose={props.onClose}>
      <h3 className="pb-2 font-bold text-center">Share this workout</h3>
      <div
        className="p-2 overflow-x-auto whitespace-no-wrap bg-gray-100 border border-gray-600 rounded-lg"
        ref={linkRef}
      >
        {link}
      </div>

      <div className="m-1">
        <button
          className="ls-modal-share-copy text-blue-700 underline"
          onClick={() => {
            const text = linkRef.current.textContent;
            if (text != null) {
              ClipboardUtils.copy(text);
              setIsCopied(true);
            }
          }}
        >
          Copy the link to clipboard
        </button>
        {isCopied && <span className="ml-4 text-gray-600">Copied!</span>}
      </div>
      <div className="font-bold text-center">OR</div>
      <div className="m-2 text-center">
        <Button
          kind="blue"
          className="ls-modal-share-facebook"
          onClick={() => {
            const url = new URL("https://www.facebook.com/dialog/share");
            url.searchParams.set("app_id", "3448767138535273");
            url.searchParams.set("display", "popup");
            url.searchParams.set("href", link);
            url.searchParams.set("hashtag", "liftosaur");
            url.searchParams.set("quote", "Check out my weightlifting workout!");
            url.searchParams.set("redirect_url", link);
            window.open(url.toString(), "_blank", "width=555,height=510,top=20,left=20");
          }}
        >
          Share on Facebook
        </Button>
      </div>
      <div className="m-4 text-center">
        <Button
          kind="blue"
          className="ls-modal-share-twitter"
          onClick={() => {
            const url = new URL("https://twitter.com/intent/tweet");
            url.searchParams.set("text", `Check out my weightlifting workout!`);
            url.searchParams.set("url", link);
            url.searchParams.set("hashtag", "liftosaur");
            window.open(url.toString(), "_blank", "width=555,height=510,top=20,left=20");
          }}
        >
          Share on Twitter
        </Button>
      </div>
    </Modal>
  );
}
