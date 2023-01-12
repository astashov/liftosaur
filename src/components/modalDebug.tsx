import { h, JSX, Fragment } from "preact";
import { ILoading } from "../models/state";
import { CollectionUtils } from "../utils/collection";
import { DateUtils } from "../utils/date";
import { ObjectUtils } from "../utils/object";
import { Modal } from "./modal";

interface IModalDebugProps {
  onClose: () => void;
  loading: ILoading;
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
            color = "text-redv2-main";
          } else if (item.endTime) {
            color = "text-greenv2-main";
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
    </Modal>
  );
}
