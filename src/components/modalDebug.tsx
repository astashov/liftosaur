import { h, JSX, Fragment } from "preact";
import { Thunk_postDebug } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { ILoading } from "../models/state";
import { CollectionUtils_sortBy, CollectionUtils_nonnull } from "../utils/collection";
import { DateUtils_formatHHMMSS } from "../utils/date";
import { ObjectUtils_values } from "../utils/object";
import { Button } from "./button";
import { Modal } from "./modal";
import { SendMessage_toIos } from "../utils/sendMessage";

interface IModalDebugProps {
  onClose: () => void;
  loading: ILoading;
  dispatch: IDispatch;
}

export function ModalDebug(props: IModalDebugProps): JSX.Element {
  const loadingItems = props.loading.items;
  const items = CollectionUtils_sortBy(CollectionUtils_nonnull(ObjectUtils_values(loadingItems)), "startTime");
  return (
    <Modal isHidden={false} onClose={props.onClose} shouldShowClose={true} isFullWidth>
      <h3 className="pb-2 font-bold">Network calls</h3>
      <ul>
        {items.map((item) => {
          const startTime = DateUtils_formatHHMMSS(item.startTime);
          const endTime = item.endTime || Date.now();
          const duration = endTime - item.startTime;
          const attempt = item.attempt || 0;
          let color;
          if (item.error) {
            color = "text-text-error";
          } else if (item.endTime) {
            color = "text-text-success";
          } else {
            color = "text-gray2-main";
          }
          return (
            <li className={`${color} pb-1`}>
              <div>
                <strong>{startTime}</strong>: <span>{item.type}</span>
                {attempt > 0 ? <span>({attempt + 1})</span> : <></>} - <span>{duration}ms</span>
              </div>
              {item.error && <div>{item.error}</div>}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 text-center">
        <Button name="send-debug-info" kind="purple" onClick={() => props.dispatch(Thunk_postDebug())}>
          Send Debug Info
        </Button>
      </div>
      <div className="mt-4 text-center">
        <Button name="share-device-logs" kind="purple" onClick={() => SendMessage_toIos({ type: "shareLog" })}>
          Share device logs
        </Button>
      </div>
    </Modal>
  );
}
