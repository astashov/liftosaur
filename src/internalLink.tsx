import { h, JSX, ComponentChildren } from "preact";
import {
  SendMessage_isIos,
  SendMessage_iosAppVersion,
  SendMessage_toIos,
  SendMessage_isAndroid,
  SendMessage_androidAppVersion,
  SendMessage_toAndroid,
} from "./utils/sendMessage";
import { UrlUtils_build } from "./utils/url";

interface IProps {
  href: string;
  className?: string;
  children: ComponentChildren;
  name: string;
}

export function InternalLink(props: IProps): JSX.Element {
  if (SendMessage_isIos()) {
    if (SendMessage_iosAppVersion() > 4) {
      return (
        <button
          className={`block w-full ${props.className} nm-${props.name}`}
          onClick={() => {
            const url = UrlUtils_build(props.href, window.location.href.replace("liftosaur://", "https://"));
            SendMessage_toIos({ type: "openUrl", url: url.toString() });
          }}
        >
          {props.children}
        </button>
      );
    } else {
      return (
        <a href={props.href} className={props.className}>
          {props.children}
        </a>
      );
    }
  } else if (SendMessage_isAndroid() && SendMessage_androidAppVersion() > 11) {
    return (
      <button
        className={`block w-full ${props.className} nm-${props.name}`}
        onClick={() => {
          const url = UrlUtils_build(props.href, window.location.href);
          SendMessage_toAndroid({ type: "openUrl", url: url.toString() });
        }}
      >
        {props.children}
      </button>
    );
  } else {
    return (
      <a
        href={props.href}
        target="_blank"
        className={props.className}
        onClick={(e) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((window.navigator as any).standalone) {
            e.preventDefault();
            window.open(`https://liftosaur.netlify.app${props.href}`, "_blank");
          }
        }}
      >
        {props.children}
      </a>
    );
  }
}
