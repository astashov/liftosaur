import { JSX, useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { useNavOptions } from "../../navigation/useNavOptions";
import { Service } from "../../api/service";
import { IDispatch } from "../../ducks/types";
import { Thunk_pushScreen } from "../../ducks/thunks";
import { Thunk_loadFollows } from "../../ducks/socialThunks";
import { Button } from "../button";
import { IconSpinner } from "../icons/iconSpinner";
import { Avatar } from "./avatar";

interface IProps {
  token: string;
  userId?: string;
  service: Service;
  dispatch: IDispatch;
}

type IFollowInviteStatus =
  | { kind: "loading" }
  | { kind: "ready"; nickname?: string; isSelf: boolean }
  | { kind: "sending"; nickname?: string }
  | { kind: "sent"; nickname?: string; isApproved: boolean }
  | { kind: "invalid" }
  | { kind: "error" };

export function ScreenFollowInvite(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "Follow request" });
  const [status, setStatus] = useState<IFollowInviteStatus>({ kind: "loading" });
  const isLoggedIn = props.userId != null;

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }
    let cancelled = false;
    props.service.getFollowInvite(props.token).then((result) => {
      if (!cancelled) {
        setStatus(
          result.success
            ? { kind: "ready", nickname: result.data.nickname, isSelf: result.data.isSelf }
            : { kind: result.error === "notfound" ? "invalid" : "error" }
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [props.token, isLoggedIn]);

  const send = async (nickname?: string): Promise<void> => {
    setStatus({ kind: "sending", nickname });
    const result = await props.service.requestFollow(props.token);
    if (result.success) {
      setStatus({ kind: "sent", nickname, isApproved: result.data.status === "approved" });
      props.dispatch(Thunk_loadFollows());
    } else {
      setStatus({ kind: result.error === "notfound" ? "invalid" : "error" });
    }
  };

  if (!isLoggedIn) {
    return (
      <View className="items-center py-10 px-gutter">
        <Text className="mb-4 text-center text-text-secondary">Log in to send a follow request.</Text>
        <Button kind="purple" name="follow-invite-login" onClick={() => props.dispatch(Thunk_pushScreen("account"))}>
          Log in
        </Button>
      </View>
    );
  }

  const nickname = "nickname" in status ? status.nickname : undefined;
  return (
    <View className="items-center py-10 px-gutter">
      {status.kind === "loading" && <IconSpinner width={24} height={24} />}
      {status.kind === "invalid" && (
        <Text className="text-center text-text-secondary">
          This invite expired or was already used. Ask for a new one.
        </Text>
      )}
      {status.kind === "error" && <Text className="text-center text-text-error">Something went wrong. Try again.</Text>}
      {(status.kind === "ready" || status.kind === "sending" || status.kind === "sent") && (
        <>
          <Avatar seed={props.token} nickname={nickname} size={72} />
          <Text className="mt-3 text-lg font-semibold">{nickname || "A Liftosaur lifter"}</Text>
          {status.kind === "ready" && status.isSelf ? (
            <Text className="mt-4 text-center text-text-secondary">This is your own invite.</Text>
          ) : status.kind === "sent" ? (
            <Text className="mt-4 text-center text-text-secondary">
              {status.isApproved
                ? "You already follow them."
                : "Request sent. They choose what you can see after approving."}
            </Text>
          ) : (
            <>
              <Text className="mt-2 mb-6 text-center text-text-secondary">
                They choose what you can see after approving.
              </Text>
              <Button
                kind="purple"
                name="follow-invite-send"
                data-testid="follow-invite-send"
                testID="follow-invite-send"
                className="w-full"
                disabled={status.kind === "sending"}
                onClick={() => send(nickname)}
              >
                Send follow request
              </Button>
            </>
          )}
        </>
      )}
    </View>
  );
}
