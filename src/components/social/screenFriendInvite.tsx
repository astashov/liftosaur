import { JSX, useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { useNavOptions } from "../../navigation/useNavOptions";
import { Service } from "../../api/service";
import { ProgramQrCode } from "../programQrCode";
import { Button } from "../button";
import { IconSpinner } from "../icons/iconSpinner";
import { LinkShare_share } from "../../utils/linkShare";
import { Avatar } from "./avatar";
import { NicknameGate } from "./nicknameGate";
import { Follow_needsNickname } from "../../models/follow";
import { IDispatch } from "../../ducks/types";
import { Thunk_askNotificationPermission } from "../../ducks/notificationThunks";

interface IProps {
  service: Service;
  userId: string;
  nickname?: string;
  dispatch: IDispatch;
}

type IInviteStatus = { kind: "loading" } | { kind: "ready"; url: string } | { kind: "error" };

export function ScreenFriendInvite(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "Invite a friend" });
  if (props.nickname == null || Follow_needsNickname(props.nickname)) {
    return (
      <View className="flex-1 pt-6 px-gutter">
        <NicknameGate reason="Your friend sees it on the invite and in their friends list." dispatch={props.dispatch} />
      </View>
    );
  }
  return (
    <FriendInviteCode
      service={props.service}
      userId={props.userId}
      nickname={props.nickname}
      dispatch={props.dispatch}
    />
  );
}

function FriendInviteCode(props: {
  service: Service;
  userId: string;
  nickname: string;
  dispatch: IDispatch;
}): JSX.Element {
  const [status, setStatus] = useState<IInviteStatus>({ kind: "loading" });
  const [shareNote, setShareNote] = useState<string | undefined>(undefined);

  useEffect(() => {
    props.dispatch(Thunk_askNotificationPermission());
    let cancelled = false;
    setStatus({ kind: "loading" });
    props.service.createFollowInvite().then((result) => {
      if (!cancelled) {
        setStatus(result.success ? { kind: "ready", url: result.data.url } : { kind: "error" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const share = async (url: string): Promise<void> => {
    const outcome = await LinkShare_share({ url, message: "Follow my training on Liftosaur:" });
    setShareNote(outcome === "copied" ? "Link copied" : undefined);
  };

  return (
    <View className="items-center flex-1 pt-6 px-gutter">
      <Avatar nickname={props.nickname} size={64} />
      <Text className="mt-3 text-lg font-semibold">{props.nickname}</Text>
      <Text className="mt-1 mb-6 text-center text-text-secondary">
        Have a friend scan this to follow your training. You approve each request and choose what they can see.
      </Text>
      <View
        className="items-center justify-center p-4 border rounded-2xl border-border-cardpurple bg-background-default"
        style={{ minWidth: 252, minHeight: 252 }}
      >
        {status.kind === "loading" && <IconSpinner width={24} height={24} />}
        {status.kind === "ready" && <ProgramQrCode url={status.url} size={220} />}
        {status.kind === "error" && <Text className="text-center text-text-error">Couldn't create an invite</Text>}
      </View>
      <Text className="mt-4 text-xs text-center text-text-secondary">
        Anyone with the link can ask to follow you for 7 days.
      </Text>
      <View className="w-full mt-6 gap-3">
        {status.kind === "ready" && (
          <Button
            kind="purple"
            name="friend-invite-share"
            data-testid="friend-invite-share"
            testID="friend-invite-share"
            className="w-full"
            onClick={() => share(status.url)}
          >
            Share invite link
          </Button>
        )}
        {shareNote ? <Text className="text-sm text-center text-text-secondary">{shareNote}</Text> : null}
      </View>
    </View>
  );
}
