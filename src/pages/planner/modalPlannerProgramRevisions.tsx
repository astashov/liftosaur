import { JSX, useEffect, useState } from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { Service } from "../../api/service";
import { Dialog_confirm } from "../../utils/dialog";
import { Button } from "../../components/button";
import { IconSpinner } from "../../components/icons/iconSpinner";
import { LinkButton } from "../../components/linkButton";
import { Modal } from "../../components/modal";
import { Text } from "../../components/primitives/text";
import { DateUtils_parseYYYYMMDDHHMM, DateUtils_formatWithTime } from "../../utils/date";
import { IEither } from "../../utils/types";
import { PlannerCodeBlock } from "./components/plannerCodeBlock";

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
  const { width } = useWindowDimensions();
  const isWide = width >= 640;

  const sidebar = (
    <View
      className={
        isWide
          ? "bg-background-subtle border-r border-border-neutral w-64"
          : "bg-background-subtle border-b border-border-neutral h-40"
      }
    >
      <View className="flex-1">
        <View className="p-4">
          <Text className="text-lg font-bold">Version History</Text>
        </View>
        <ScrollView contentContainerClassName="px-4 pb-3">
          {props.revisions.map((revision) => {
            const date = DateUtils_parseYYYYMMDDHHMM(revision);
            if (!date) {
              return null;
            }
            const text = DateUtils_formatWithTime(date);
            return (
              <View key={revision} className="py-1">
                {revision === currentRevision ? (
                  <Text className="font-bold">{text}</Text>
                ) : (
                  <LinkButton
                    name="change-program-revision"
                    onClick={() => {
                      loadRevision(revision);
                    }}
                  >
                    {text}
                  </LinkButton>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  const body = (
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
  );

  return (
    <View className={isWide ? "flex-1 flex-row" : "flex-1 flex-col"}>
      {sidebar}
      {body}
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
