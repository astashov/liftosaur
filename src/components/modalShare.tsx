import { h, JSX } from "preact";
import { Modal } from "./modal";
import { Share } from "../models/share";
import { Button } from "./button";

interface IProps {
  userId: string;
  id: number;
  onClose: () => void;
}

export function ModalShare(props: IProps): JSX.Element {
  const link = Share.generateLink(props.userId, props.id);

  return (
    <Modal shouldShowClose={true} onClose={props.onClose}>
      <h3 className="pb-2 font-bold text-center">Share this workout</h3>
      <div className="p-4 overflow-x-auto whitespace-no-wrap bg-gray-100 border border-gray-600 rounded-lg">{link}</div>

      <div className="m-4 text-center">
        <button>Copy the link to clipboard</button>
      </div>
      <div className="text-center">or</div>
      <div className="m-4 text-center">
        <Button
          kind="blue"
          onClick={() => {
            const url = new URL("https://www.facebook.com/dialog/share");
            url.searchParams.set("app_id", "3448767138535273");
            url.searchParams.set("display", "popup");
            url.searchParams.set("href", link);
            url.searchParams.set("hashtag", "liftosaur");
            url.searchParams.set("quote", "Check out my workout!");
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
          onClick={() => {
            const url = new URL("https://twitter.com/intent/tweet");
            url.searchParams.set("text", "Check out my workout!");
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
