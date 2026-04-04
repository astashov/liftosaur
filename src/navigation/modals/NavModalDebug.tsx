import type { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { Thunk_postDebug } from "../../ducks/thunks";
import { CollectionUtils_sortBy, CollectionUtils_nonnull } from "../../utils/collection";
import { DateUtils_formatHHMMSS } from "../../utils/date";
import { ObjectUtils_values } from "../../utils/object";
import { Button } from "../../components/button";
import { SendMessage_toIos } from "../../utils/sendMessage";

export function NavModalDebug(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();

  const loadingItems = state.loading.items;
  const items = CollectionUtils_sortBy(CollectionUtils_nonnull(ObjectUtils_values(loadingItems)), "startTime");

  return (
    <ModalScreenContainer onClose={() => navigation.goBack()} isFullWidth>
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
            <li key={item.startTime} className={`${color} pb-1`}>
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
        <Button name="send-debug-info" kind="purple" onClick={() => dispatch(Thunk_postDebug())}>
          Send Debug Info
        </Button>
      </div>
      <div className="mt-4 text-center">
        <Button name="share-device-logs" kind="purple" onClick={() => SendMessage_toIos({ type: "shareLog" })}>
          Share device logs
        </Button>
      </div>
    </ModalScreenContainer>
  );
}
