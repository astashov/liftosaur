import { useState, type JSX } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { Text } from "../../components/primitives/text";
import { Thunk_postDebug, Thunk_adminCheckKey, Thunk_adminLoginAsUser } from "../../ducks/thunks";
import { CollectionUtils_sortBy, CollectionUtils_nonnull } from "../../utils/collection";
import { DateUtils_formatHHMMSS } from "../../utils/date";
import { ObjectUtils_values } from "../../utils/object";
import { Button } from "../../components/button";
import { Input } from "../../components/input";
import { SendMessage_toIos, SendMessage_toAndroid } from "../../utils/sendMessage";
import { ShareLog_share } from "../../utils/shareLog";

export function NavModalDebug(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();

  const loadingItems = state.loading.items;
  const items = CollectionUtils_sortBy(CollectionUtils_nonnull(ObjectUtils_values(loadingItems)), "startTime");

  const [adminKey, setAdminKey] = useState("");
  const [isKeyValid, setIsKeyValid] = useState(false);
  const [keyError, setKeyError] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState("");
  const [storageId, setStorageId] = useState("");

  return (
    <ModalScreenContainer onClose={() => navigation.goBack()} isFullWidth>
      <FormSheet>
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
        <View className="pt-6 mt-6 border-t border-border-neutral">
          <Text className="pb-2 font-bold">Login as user</Text>
          {!isKeyValid ? (
            <View>
              <Input
                identifier="admin-key"
                label="Admin key"
                type="password"
                changeType="oninput"
                changeHandler={(r) => {
                  if (r.success) {
                    setAdminKey(r.data);
                  }
                }}
              />
              {keyError && <Text className="pt-1 text-xs text-text-error">{keyError}</Text>}
              <View className="items-center mt-2">
                <Button
                  name="admin-validate-key"
                  kind="purple"
                  onClick={() => {
                    setKeyError(undefined);
                    if (!adminKey.trim()) {
                      return;
                    }
                    dispatch(
                      Thunk_adminCheckKey(adminKey.trim(), (isValid) => {
                        setIsKeyValid(isValid);
                        if (!isValid) {
                          setKeyError("Invalid admin key");
                        }
                      })
                    );
                  }}
                >
                  Validate
                </Button>
              </View>
            </View>
          ) : (
            <View>
              <Text className="pb-2 text-xs text-text-success">
                Admin key valid. The session loads into an isolated, non-syncing local account (tagged DEBUG in
                Account). Switch back / delete it there when done.
              </Text>
              <Input
                identifier="admin-userid"
                label="User id"
                type="text"
                changeType="oninput"
                changeHandler={(r) => {
                  if (r.success) {
                    setUserId(r.data);
                  }
                }}
              />
              <View className="pt-2">
                <Input
                  identifier="admin-storageid"
                  label="Storage id (optional)"
                  type="text"
                  changeType="oninput"
                  changeHandler={(r) => {
                    if (r.success) {
                      setStorageId(r.data);
                    }
                  }}
                />
              </View>
              <View className="items-center mt-3">
                <Button
                  name="admin-login-as-user"
                  kind="purple"
                  onClick={() => {
                    if (!userId.trim()) {
                      return;
                    }
                    dispatch(Thunk_adminLoginAsUser(userId.trim(), adminKey.trim(), storageId.trim() || undefined));
                    navigation.goBack();
                  }}
                >
                  Login as user
                </Button>
              </View>
            </View>
          )}
        </View>
      </FormSheet>
    </ModalScreenContainer>
  );
}
