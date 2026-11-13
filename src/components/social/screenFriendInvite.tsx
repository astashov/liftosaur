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

interface IProps {
  service: Service;
  userId: string;
  nickname?: string;
}

type IInviteStatus = { kind: "loading" } | { kind: "ready"; url: string } | { kind: "error" };

export function ScreenFriendInvite(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "Invite a friend" });
  const [status, setStatus] = useState<IInviteStatus>({ kind: "loading" });
  const [shareNote, setShareNote] = useState<string | undefined>(undefined);

  useEffect(() => {
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
      <Avatar seed={props.userId} nickname={props.nickname} size={64} />
      <Text className="mt-3 text-lg font-semibold">{props.nickname || "You"}</Text>
      <Text className="mt-1 mb-6 text-center text-text-secondary">
        Have a friend scan this with their phone camera, or share the link.
      </Text>
      <View
        className="items-center justify-center p-4 border rounded-2xl border-border-cardpurple bg-background-default"
        style={{ minWidth: 252, minHeight: 252 }}
      >
        {status.kind === "loading" && <IconSpinner width={24} height={24} />}
        {status.kind === "ready" && <ProgramQrCode url={status.url} size={220} />}
        {status.kind === "error" && <Text className="text-center text-text-error">Couldn't create an invite</Text>}
      </View>
      <Text className="mt-4 text-xs text-center text-text-secondary">The link works once and expires in 7 days.</Text>
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
