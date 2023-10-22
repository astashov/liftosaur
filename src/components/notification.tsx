import { lb } from "lens-shmens";
import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { INotification, IState, updateState } from "../models/state";
import { IconClose } from "./icons/iconClose";

interface IProps {
  notification?: INotification;
  dispatch: IDispatch;
}

export function Notification(props: IProps): JSX.Element | null {
  const { notification, dispatch } = props;
  if (notification == null) {
    return null;
  }
  return (
    <div
      className="absolute top-0 left-0 z-20 w-full p-4"
      style={{ minHeight: "40px" }}
      onClick={() => {
        updateState(dispatch, [lb<IState>().p("notification").record(undefined)]);
      }}
    >
      <div
        className={`relative shadow-lg px-4 py-2 pr-10 rounded ${
          notification.type === "error" ? "bg-red-300" : "bg-green-200"
        }`}
      >
        <button className="box-content absolute top-0 right-0 p-3 nm-notification-close">
          <IconClose size={16} />
        </button>
        <span className="text-sm">{notification.content}</span>
      </div>
    </div>
  );
}
