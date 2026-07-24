import { JSX, useEffect, useState } from "react";
import { View, ScrollView, Pressable, Platform } from "react-native";
import { Service } from "../../api/service";
import { Dialog_confirm } from "../../utils/dialog";
import { ActionSheet_show } from "../../utils/actionSheet";
import { Button } from "../../components/button";
import { IconSpinner } from "../../components/icons/iconSpinner";
import { IconArrowDown2 } from "../../components/icons/iconArrowDown2";
import { IconArrowUp } from "../../components/icons/iconArrowUp";
import { LinkButton } from "../../components/linkButton";
import { Modal } from "../../components/modal";
import { Text } from "../../components/primitives/text";
import { DateUtils_parseYYYYMMDDHHMM, DateUtils_formatWithTime } from "../../utils/date";
import { IEither } from "../../utils/types";
import { PlannerCodeBlock } from "./components/plannerCodeBlock";
import { SheetDragHandle } from "../../navigation/TransparentModal";

interface IModalPlannerProgramRevisionsProps {
  client: Window["fetch"];
  programId: string;
  revisions: string[];
  onClose: () => void;
  onRestore: (text: string) => void;
}

type IProgramRevisionState =
  | {
      isLoading: true;
      promise: Promise<IEither<string, string>>;
    }
  | {
      isLoading: false;
      result: IEither<string, string>;
    };

export function ModalPlannerProgramRevisionsContent(props: IModalPlannerProgramRevisionsProps): JSX.Element {
  const initialCurrentRevision = props.revisions[0];
  const [currentRevision, setCurrentRevision] = useState<string>(initialCurrentRevision);
  const [state, setState] = useState<Partial<Record<string, IProgramRevisionState>>>({});
  const service = new Service(props.client);

  function loadRevision(revision: string): void {
    setCurrentRevision(revision);
    if (state[revision]) {
      return;
    }
    const result = service.getProgramRevision(props.programId, revision);
    setState((prevState) => ({
      ...prevState,
      [revision]: { isLoading: true, promise: result },
    }));
    result.then((r) => {
      setState((prevState) => ({
        ...prevState,
        [revision]: { isLoading: false, result: r },
      }));
    });
  }

  useEffect(() => {
    loadRevision(currentRevision);
  }, []);

  const programRevision = state[currentRevision];
  const [isPickerExpanded, setIsPickerExpanded] = useState(false);

  const revisionLabels = props.revisions.map((revision) => {
    const date = DateUtils_parseYYYYMMDDHHMM(revision);
    return date ? DateUtils_formatWithTime(date) : revision;
  });
  const currentLabel = revisionLabels[props.revisions.indexOf(currentRevision)] ?? currentRevision;

  function openPicker(): void {
    if (Platform.OS === "web") {
      setIsPickerExpanded((v) => !v);
      return;
    }
    const options = [...revisionLabels, "Cancel"];
    ActionSheet_show({ title: "Version History", options, cancelButtonIndex: options.length - 1 }, (buttonIndex) => {
      if (buttonIndex != null && buttonIndex < props.revisions.length) {
        loadRevision(props.revisions[buttonIndex]);
      }
    });
  }

  const picker = (
    <View className="border-b bg-background-subtle border-border-neutral">
      <SheetDragHandle>
        <Pressable className="flex-row items-center justify-between p-4" onPress={openPicker}>
          <View className="flex-1 pr-3">
            <Text className="text-xs text-text-secondary">Version</Text>
            <Text className="font-bold">{currentLabel}</Text>
          </View>
          {Platform.OS === "web" && isPickerExpanded ? <IconArrowUp /> : <IconArrowDown2 />}
        </Pressable>
      </SheetDragHandle>
      {Platform.OS === "web" && isPickerExpanded && (
        <View className="px-4 pb-3" style={{ maxHeight: 220 }}>
          <ScrollView>
            {props.revisions.map((revision, i) => (
              <View key={revision} className="py-1">
                {revision === currentRevision ? (
                  <Text className="font-bold">{revisionLabels[i]}</Text>
                ) : (
                  <LinkButton
                    name="change-program-revision"
                    onClick={() => {
                      loadRevision(revision);
                      setIsPickerExpanded(false);
                    }}
                  >
                    {revisionLabels[i]}
                  </LinkButton>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <View className="flex-col flex-1">
      {picker}
      <View className="flex-1">
        {!programRevision || programRevision.isLoading ? (
          <View className="items-center justify-center flex-1">
            <IconSpinner width={40} height={40} />
          </View>
        ) : programRevision.result.success ? (
          <View className="flex-1">
            <ScrollView className="flex-1" contentContainerClassName="p-4">
              <PlannerCodeBlock script={programRevision.result.data} />
            </ScrollView>
            <View className="items-center p-4 border-t bg-background-subtle border-border-neutral">
              <Button
                name="restore-program-revision"
                kind="purple"
                onClick={async () => {
                  if (
                    programRevision.result.success &&
                    (await Dialog_confirm(
                      "Are you sure you want to restore this version? It'll overwrite your current changes."
                    ))
                  ) {
                    props.onRestore(programRevision.result.data);
                  }
                }}
              >
                Restore
              </Button>
            </View>
          </View>
        ) : (
          <View className="p-4">
            <Text>{programRevision.result.error}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function ModalPlannerProgramRevisions(props: IModalPlannerProgramRevisionsProps): JSX.Element {
  return (
    <Modal
      innerClassName="flex flex-col"
      isFullWidth={true}
      isFullHeight={true}
      onClose={props.onClose}
      shouldShowClose={true}
      noPaddings={true}
    >
      <ModalPlannerProgramRevisionsContent {...props} />
    </Modal>
  );
}
