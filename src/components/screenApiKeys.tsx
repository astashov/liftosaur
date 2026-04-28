import { JSX, useEffect, useRef, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { useNavOptions } from "../navigation/useNavOptions";
import { GroupHeader } from "./groupHeader";
import { Button } from "./button";
import { Input } from "./input";
import { INavCommon } from "../models/state";
import { Service } from "../api/service";
import { ClipboardUtils_copy } from "../utils/clipboard";
import { ISubscription } from "../types";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import { Thunk_pushScreen } from "../ducks/thunks";
import { IconSpinner } from "./icons/iconSpinner";
import { Dialog_confirm } from "../utils/dialog";

interface IApiKey {
  key: string;
  name: string;
  createdAt: number;
}

interface IProps {
  dispatch: IDispatch;
  navCommon: INavCommon;
  service: Service;
  subscription: ISubscription;
  userId?: string;
}

export function ScreenApiKeys(props: IProps): JSX.Element {
  const [keys, setKeys] = useState<IApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const newKeyNameRef = useRef("");
  const [copiedKey, setCopiedKey] = useState<string | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | undefined>(undefined);
  const isLoggedIn = props.userId != null;
  const isSubscribed = Subscriptions_hasSubscription(props.subscription);

  useEffect(() => {
    if (isSubscribed) {
      props.service.getApiKeys().then((result) => {
        setKeys(result);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleCreate = async (): Promise<void> => {
    const name = newKeyNameRef.current.trim() || "API Key";
    setIsCreating(true);
    setCreateError(undefined);
    const result = await props.service.createApiKey(name);
    setIsCreating(false);
    if (result) {
      setKeys([...keys, result]);
      newKeyNameRef.current = "";
    } else {
      setCreateError("Failed to create API key. Please try again.");
    }
  };

  const handleDelete = async (key: string): Promise<void> => {
    if (!(await Dialog_confirm("Are you sure you want to delete this API key?"))) {
      return;
    }
    const success = await props.service.deleteApiKey(key);
    if (success) {
      setKeys(keys.filter((k) => k.key !== key));
    }
  };

  const handleCopy = (key: string): void => {
    ClipboardUtils_copy(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(undefined), 2000);
  };

  useNavOptions({ navTitle: "API Keys" });

  return (
    <View className="px-4">
      {!isLoggedIn ? (
        <View className="py-8">
          <Text className="mb-4 text-center text-text-secondary">
            API keys let you integrate Liftosaur with external tools, LLMs, and MCP servers. You can read and edit your
            workout history and programs, and simulate workouts via the playground endpoint.
          </Text>
          <Text className="text-center text-text-secondary">You need to log in first to manage API keys.</Text>
          <View className="items-center mt-4">
            <Button kind="purple" name="login-for-api" onClick={() => props.dispatch(Thunk_pushScreen("account"))}>
              Log in
            </Button>
          </View>
        </View>
      ) : !isSubscribed ? (
        <View className="py-8">
          <Text className="mb-4 text-center text-text-secondary">
            API keys let you integrate Liftosaur with external tools, LLMs, and MCP servers. You can read and edit your
            workout history and programs, and simulate workouts via the playground endpoint.
          </Text>
          <View className="items-center">
            <Button
              kind="purple"
              name="subscribe-for-api"
              onClick={() => props.dispatch(Thunk_pushScreen("subscription"))}
            >
              Subscribe to unlock
            </Button>
          </View>
        </View>
      ) : (
        <>
          <GroupHeader name="Create New Key" />
          <View className="flex-row items-center gap-2 pb-2">
            <View className="flex-1">
              <Input
                type="text"
                inputSize="sm"
                placeholder="Key name"
                changeHandler={(result) => {
                  if (result.success) {
                    newKeyNameRef.current = result.data;
                  }
                }}
              />
            </View>
            <Button kind="purple" buttonSize="lg" name="create-api-key" disabled={isCreating} onClick={handleCreate}>
              {isCreating ? (
                <IconSpinner color="white" width={18} height={18} />
              ) : (
                <Text className="text-text-alwayswhite font-semibold">Create</Text>
              )}
            </Button>
          </View>
          {createError && <Text className="pb-2 text-xs text-text-error">{createError}</Text>}

          <GroupHeader name="Your Keys" topPadding={true} />
          {isLoading ? (
            <View className="items-center py-4">
              <IconSpinner width={40} height={40} />
            </View>
          ) : keys.length === 0 ? (
            <Text className="py-4 text-center text-text-secondary">No API keys yet</Text>
          ) : (
            keys.map((apiKey) => (
              <View key={apiKey.key} className="py-2 border-b border-border-neutral">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 min-w-0">
                    <Text className="font-bold">{apiKey.name}</Text>
                    <Text className="text-xs text-text-secondary">{apiKey.key}</Text>
                    <Text className="text-xs text-text-secondary">
                      Created {new Date(apiKey.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="flex-row gap-4 ml-2 shrink-0">
                    <Pressable testID="copy-api-key" data-cy="copy-api-key" data-testid="copy-api-key" onPress={() => handleCopy(apiKey.key)}>
                      <Text className="text-xs underline text-text-link">
                        {copiedKey === apiKey.key ? "Copied!" : "Copy"}
                      </Text>
                    </Pressable>
                    <Pressable
                      testID="delete-api-key"
                      data-cy="delete-api-key" data-testid="delete-api-key"
                      onPress={() => handleDelete(apiKey.key)}
                    >
                      <Text className="text-xs underline text-text-error">Delete</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </>
      )}
    </View>
  );
}
