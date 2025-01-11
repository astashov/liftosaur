import React, { JSX } from "react";
import { Thunk } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { ILoading } from "../models/state";
import { CollectionUtils } from "../utils/collection";
import { DateUtils } from "../utils/date";
import { ObjectUtils } from "../utils/object";
import { Button } from "./button";
import { LftModal } from "./modal";

interface IModalDebugProps {
  onClose: () => void;
  loading: ILoading;
  dispatch: IDispatch;
}

export function ModalDebug(props: IModalDebugProps): JSX.Element {
  const loadingItems = props.loading.items;
  const items = CollectionUtils.sortBy(CollectionUtils.nonnull(ObjectUtils.values(loadingItems)), "startTime");
  return (
    <LftModal isHidden={false} onClose={props.onClose} shouldShowClose={true} isFullWidth>
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
      <div className="mt-4 text-center">
        <Button name="send-debug-info" kind="orange" onClick={() => props.dispatch(Thunk.postDebug())}>
          Send Debug Info
        </Button>
      </div>
    </LftModal>
  );
}
