import { JSX, useEffect, useState } from "react";
import { IDispatch } from "../ducks/types";
import { NavbarView } from "./navbar";
import { Surface } from "./surface";
import { Footer2View } from "./footer2";
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
  const [newKeyName, setNewKeyName] = useState("");
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
    const name = newKeyName.trim() || "API Key";
    setIsCreating(true);
    setCreateError(undefined);
    const result = await props.service.createApiKey(name);
    setIsCreating(false);
    if (result) {
      setKeys([...keys, result]);
      setNewKeyName("");
    } else {
      setCreateError("Failed to create API key. Please try again.");
    }
  };

  const handleDelete = async (key: string): Promise<void> => {
    if (!confirm("Are you sure you want to delete this API key?")) {
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

  return (
    <Surface
      navbar={<NavbarView navCommon={props.navCommon} dispatch={props.dispatch} title="API Keys" />}
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
    >
      <section className="px-4">
        {!isLoggedIn ? (
          <div className="py-8 text-center">
            <div className="mb-4 text-text-secondary">
              API keys let you integrate Liftosaur with external tools, LLMs, and MCP servers. You can read and edit
              your workout history and programs, and simulate workouts via the playground endpoint.
            </div>
            <div className="text-text-secondary">You need to log in first to manage API keys.</div>
            <Button
              kind="purple"
              name="login-for-api"
              className="mt-4"
              onClick={() => props.dispatch(Thunk_pushScreen("account"))}
            >
              Log in
            </Button>
          </div>
        ) : !isSubscribed ? (
          <div className="py-8 text-center">
            <div className="mb-4 text-text-secondary">
              API keys let you integrate Liftosaur with external tools, LLMs, and MCP servers. You can read and edit
              your workout history and programs, and simulate workouts via the playground endpoint.
            </div>
            <Button
              kind="purple"
              name="subscribe-for-api"
              onClick={() => props.dispatch(Thunk_pushScreen("subscription"))}
            >
              Subscribe to unlock
            </Button>
          </div>
        ) : (
          <>
            <GroupHeader name="Create New Key" />
            <div className="flex items-center gap-2 pb-2">
              <div className="flex-1">
                <Input
                  type="text"
                  inputSize="sm"
                  placeholder="Key name"
                  value={newKeyName}
                  onInput={(e) => setNewKeyName((e.target as HTMLInputElement).value)}
                />
              </div>
              <Button kind="purple" buttonSize="lg" name="create-api-key" disabled={isCreating} onClick={handleCreate}>
                {isCreating ? <IconSpinner color="white" width={18} height={18} /> : <span>Create</span>}
              </Button>
            </div>
            {createError && <div className="pb-2 text-xs text-text-error">{createError}</div>}

            <GroupHeader name="Your Keys" topPadding={true} />
            {isLoading ? (
              <div className="py-4 text-center text-text-secondary">
                <IconSpinner width={40} height={40} />
              </div>
            ) : keys.length === 0 ? (
              <div className="py-4 text-center text-text-secondary">No API keys yet</div>
            ) : (
              keys.map((apiKey) => (
                <div key={apiKey.key} className="py-2 border-b border-border-neutral">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold">{apiKey.name}</div>
                      <div className="font-mono text-xs break-all text-text-secondary">{apiKey.key}</div>
                      <div className="text-xs text-text-secondary">
                        Created {new Date(apiKey.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-4 ml-2 shrink-0">
                      <button
                        className="text-xs underline text-text-link nm-copy-api-key"
                        onClick={() => handleCopy(apiKey.key)}
                      >
                        {copiedKey === apiKey.key ? "Copied!" : "Copy"}
                      </button>
                      <button
                        className="text-xs underline text-text-error nm-delete-api-key"
                        onClick={() => handleDelete(apiKey.key)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </section>
    </Surface>
  );
}
