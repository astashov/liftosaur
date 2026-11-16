import { JSX, useCallback, useMemo } from "react";
import { Linking, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { FriendLoadError } from "./friendLoadError";
import { useNavOptions } from "../../navigation/useNavOptions";
import { IDispatch } from "../../ducks/types";
import { ISocialState, SocialState_friendProgramKey } from "../../models/socialState";
import { Thunk_loadFriendProgram } from "../../ducks/socialThunks";
import { FriendProgram_editorUrl, FriendProgram_previewSettings } from "../../models/friendProgram";
import { ISettings, IStats, ISubscription } from "../../types";
import { ProgramPreview } from "../programPreview";
import { IconSpinner } from "../icons/iconSpinner";
import { Button } from "../button";

declare let __HOST__: string;

interface IProps {
  userId: string;
  programId: string;
  social?: ISocialState;
  settings: ISettings;
  stats: IStats;
  subscription: ISubscription;
  dispatch: IDispatch;
}

export function ScreenFriendProgram(props: IProps): JSX.Element {
  const person = props.social?.follows?.following.find((f) => f.userId === props.userId);
  const key = SocialState_friendProgramKey(props.userId, props.programId);
  const context = props.social?.friendProgram[key];
  const error = props.social?.friendErrors[key];
  useNavOptions({ navTitle: context?.exported.program.name ?? "Program", navSubtitle: person?.nickname });
  const settings = useMemo(
    () => (context != null ? FriendProgram_previewSettings(props.settings, context.settings) : props.settings),
    [context, props.settings]
  );

  const load = useCallback(() => {
    props.dispatch(Thunk_loadFriendProgram(props.userId, props.programId));
  }, [props.userId, props.programId]);
  useFocusEffect(load);

  if (context == null && error != null) {
    return <FriendLoadError message={error} onRetry={load} />;
  }
  if (context == null) {
    return (
      <View className="items-center py-8">
        <IconSpinner width={24} height={24} />
      </View>
    );
  }
  const editButton = (
    <View className="px-4 pb-2">
      <Button
        kind="purple"
        buttonSize="md"
        name="friend-program-edit-web"
        data-testid="friend-program-edit-web"
        testID="friend-program-edit-web"
        onClick={() => Linking.openURL(FriendProgram_editorUrl(__HOST__, props.userId, props.programId))}
      >
        Edit on the web
      </Button>
    </View>
  );
  return (
    <ProgramPreview
      program={context.exported.program}
      settings={settings}
      stats={props.stats}
      subscription={props.subscription}
      isMobile={true}
      hasNavbar={true}
      useNavModals={true}
      hideMuscles={true}
      isReadOnly={true}
      headerContent={editButton}
      dispatch={props.dispatch}
    />
  );
}
