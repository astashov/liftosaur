import type { JSX } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { Text } from "../../components/primitives/text";
import { Thunk_postDebug } from "../../ducks/thunks";
import { CollectionUtils_sortBy, CollectionUtils_nonnull } from "../../utils/collection";
import { DateUtils_formatHHMMSS } from "../../utils/date";
import { ObjectUtils_values } from "../../utils/object";
import { Button } from "../../components/button";
import { SendMessage_toIos, SendMessage_toAndroid } from "../../utils/sendMessage";
import { ShareLog_share } from "../../utils/shareLog";

export function NavModalDebug(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();

  const loadingItems = state.loading.items;
  const items = CollectionUtils_sortBy(CollectionUtils_nonnull(ObjectUtils_values(loadingItems)), "startTime");

  return (
    <ModalScreenContainer onClose={() => navigation.goBack()} isFullWidth>
      <Text className="pb-2 font-bold">Network calls</Text>
      <View>
        {items.map((item) => {
          const startTime = DateUtils_formatHHMMSS(item.startTime);
          const endTime = item.endTime || Date.now();
          const duration = endTime - item.startTime;
          const attempt = item.attempt || 0;
          let color: string;
          if (item.error) {
            color = "text-text-error";
          } else if (item.endTime) {
            color = "text-text-success";
          } else {
            color = "text-gray2-main";
          }
          return (
            <View key={item.startTime} className="pb-1">
              <Text className={color}>
                <Text className={`${color} font-bold`}>{startTime}</Text>: <Text className={color}>{item.type}</Text>
                {attempt > 0 ? <Text className={color}>({attempt + 1})</Text> : null} -{" "}
                <Text className={color}>{duration}ms</Text>
              </Text>
              {item.error && <Text className={color}>{item.error}</Text>}
            </View>
          );
        })}
      </View>
      <View className="items-center mt-4">
        <Button name="send-debug-info" kind="purple" onClick={() => dispatch(Thunk_postDebug())}>
          Send Debug Info
        </Button>
      </View>
      <View className="items-center mt-4">
        <Button
          name="share-device-logs"
          kind="purple"
          onClick={() => {
            SendMessage_toIos({ type: "shareLog" });
            SendMessage_toAndroid({ type: "shareLog" });
            ShareLog_share();
          }}
        >
          Share device logs
        </Button>
      </View>
    </ModalScreenContainer>
  );
}
