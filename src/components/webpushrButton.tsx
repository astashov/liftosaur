import { h, JSX } from "preact";
import { SendMessage } from "../utils/sendMessage";
import { MenuItemEditable } from "./menuItemEditable";

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Window {
    Notification: Notification;
    _webpushrGetLocalStorage: (key: string) => string;
    _webpushrRequestPermission: () => void;
    _webpushrTrunNotification: (status: string, element: HTMLElement | null, isSilent: boolean) => void;
  }
}

export function WebpushrButton(): JSX.Element {
  const Notif = window.Notification;
  if (!Notif || Notif.permission === "denied" || !window._webpushrGetLocalStorage || SendMessage.isIos()) {
    return <div />;
  }

  const initialValue = Notif.permission === "granted" && window._webpushrGetLocalStorage("bell_notification") !== "off";

  return (
    <MenuItemEditable
      name="Push Notifications"
      type="boolean"
      value={initialValue ? "true" : "false"}
      onChange={(newValue) => {
        if ("default" === Notif.permission) {
          window._webpushrRequestPermission();
        } else if ("granted" === Notif.permission) {
          if (newValue === "true") {
            window._webpushrTrunNotification("on", null, false);
          } else {
            window._webpushrTrunNotification("off", null, false);
          }
        }
      }}
    />
  );
}
