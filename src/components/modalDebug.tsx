import { h, JSX, Fragment } from "preact";
import { Thunk } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { ILoading } from "../models/state";
import { CollectionUtils } from "../utils/collection";
import { DateUtils } from "../utils/date";
import { ObjectUtils } from "../utils/object";
import { Button } from "./button";
import { Modal } from "./modal";
import { IndexedDBUtils, nativeStorage } from "../utils/indexeddb";
import { getIdbKey } from "../ducks/reducer";
import { NativeStorage } from "../utils/nativeStorage";

interface IModalDebugProps {
  onClose: () => void;
  loading: ILoading;
  dispatch: IDispatch;
}

export function ModalDebug(props: IModalDebugProps): JSX.Element {
  const loadingItems = props.loading.items;
  const items = CollectionUtils.sortBy(CollectionUtils.nonnull(ObjectUtils.values(loadingItems)), "startTime");
  return (
    <Modal isHidden={false} onClose={props.onClose} shouldShowClose={true} isFullWidth>
      <h3 className="pb-2 font-bold">Network calls</h3>
      <ul>
        {items.map((item) => {
          const startTime = DateUtils.formatHHMMSS(item.startTime);
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
        <Button name="send-debug-info" kind="purple" onClick={() => props.dispatch(Thunk.postDebug())}>
          Send Debug Info
        </Button>
      </div>
      {NativeStorage.isAvailable() && (
        <div className="mt-4 text-center">
          <Button
            name="send-debug-info"
            kind="purple"
            onClick={async () => {
              const key = await getIdbKey();
              const indexeddbdata = await IndexedDBUtils.get(key);
              const nativestoragedata = nativeStorage ? await nativeStorage.get(key) : {};
              const isEqual = ObjectUtils.isEqual(indexeddbdata, nativestoragedata);
              alert("IS EQUAL: " + isEqual);
            }}
          >
            Compare iOS storage
          </Button>
        </div>
      )}
    </Modal>
  );
}
