import { JSX, ReactNode, useMemo, useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { IProgram, ISettings, ISubscription, IStats } from "../types";
import { IconMuscles2 } from "./icons/iconMuscles2";
import { IPoints, Muscle_normalizePoints, Muscle_getPointsForProgram, Muscle_getPointsForDay } from "../models/muscle";
import { Modal } from "./modal";
import { MusclesView } from "./muscles/musclesView";
import { Locker } from "./locker";
import { navigationRef } from "../navigation/navigationRef";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import {
  IEvaluatedProgram,
  Program_evaluate,
  Program_dayAverageTimeMs,
  Program_daysRange,
  Program_exerciseRange,
  Program_getProgramDay,
} from "../models/program";
import { TimeUtils_formatHHMM } from "../utils/time";
import { IconWatch } from "./icons/iconWatch";
import { ProgramPreviewOrPlayground } from "./programPreviewOrPlayground";
import { IconDoc } from "./icons/iconDoc";
import { StringUtils_pluralize } from "../utils/string";
import { SimpleMarkdown } from "./simpleMarkdown";
import { Link } from "./link";

export type IPreviewProgramMuscles =
  | {
      dayIndex: number;
      type: "day";
    }
  | { type: "program" };

interface IProps {
  dispatch?: IDispatch;
  settings: ISettings;
  program: IProgram;
  isMobile: boolean;
  subscription: ISubscription;
  stats: IStats;
  hasNavbar?: boolean;
  useNavModals?: boolean;
  headerContent?: ReactNode;
}

export function ProgramPreview(props: IProps): JSX.Element {
  const program = props.program;
  const settings = props.settings;
  const evaluatedProgram = useMemo(() => Program_evaluate(program, settings), [program, settings]);
  const [musclesModal, setMusclesModal] = useState<IPreviewProgramMuscles | undefined>(undefined);
  const isWeb = Platform.OS === "web";
  const headerContent = props.headerContent;

  const previewHeader = useMemo(
    () => (
      <View>
        {headerContent}
        <View className="px-4">
          <View className="flex-row items-center pt-2">
            <View className="flex-1">
              {program.url ? (
                <Link
                  testID="program-name"
                  className="text-2xl font-bold leading-tight underline text-text-link"
                  href={program.url}
                >
                  {program.name}
                </Link>
              ) : (
                <Text data-testid="program-name" testID="program-name" className="text-2xl font-bold leading-tight">
                  {program.name}
                </Text>
              )}
            </View>
            <Pressable
              data-testid="program-show-muscles"
              testID="program-show-muscles"
              className="p-2"
              onPress={() => {
                if (isWeb) {
                  setMusclesModal({ type: "program" });
                } else {
                  navigationRef.navigate("programPreviewMusclesModal", { type: "program" });
                }
              }}
            >
              <IconMuscles2 />
            </Pressable>
          </View>
          <View>
            {program.author && (
              <Text
                data-testid="program-author"
                testID="program-author"
                className="text-sm font-bold uppercase text-text-secondary"
              >
                By {program.author}
              </Text>
            )}
            <View className="flex-row items-start py-1">
              <View className="mt-0.5">
                <IconWatch />
              </View>
              <Text className="flex-1 ml-1">
                Average time to finish a workout:{" "}
                <Text className="font-bold">
                  {TimeUtils_formatHHMM(Program_dayAverageTimeMs(evaluatedProgram, settings))}
                </Text>
              </Text>
            </View>
            <View className="flex-row items-start py-1">
              <View className="mt-0.5">
                <IconDoc width={15} height={20} />
              </View>
              <Text className="flex-1 ml-1 text-text-secondary">
                {evaluatedProgram.weeks.length > 1 &&
                  `${evaluatedProgram.weeks.length} ${StringUtils_pluralize("week", evaluatedProgram.weeks.length)}, `}
                {Program_daysRange(evaluatedProgram)}, {Program_exerciseRange(evaluatedProgram)}
              </Text>
            </View>
            {program.description && (
              <View className="pt-2">
                <SimpleMarkdown value={program.description} />
              </View>
            )}
          </View>
        </View>
      </View>
    ),
    [headerContent, program, evaluatedProgram, settings, isWeb]
  );

  if (!isWeb) {
    return (
      <ProgramPreviewOrPlayground
        headerContent={previewHeader}
        program={program}
        settings={props.settings}
        isMobile={props.isMobile}
        hasNavbar={props.hasNavbar}
        stats={props.stats}
        useNavModals={props.useNavModals}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ProgramPreviewOrPlayground
        headerContent={previewHeader}
        program={program}
        settings={props.settings}
        isMobile={props.isMobile}
        hasNavbar={props.hasNavbar}
        stats={props.stats}
        useNavModals={props.useNavModals}
      />
      {musclesModal && (
        <ProgramPreviewMusclesModal
          muscles={musclesModal}
          onClose={() => setMusclesModal(undefined)}
          stats={props.stats}
          program={evaluatedProgram}
          subscription={props.subscription}
          dispatch={props.dispatch}
          settings={props.settings}
        />
      )}
    </View>
  );
}

interface IProgramPreviewMusclesModalProps {
  muscles: IPreviewProgramMuscles;
  program: IEvaluatedProgram;
  stats: IStats;
  settings: ISettings;
  dispatch?: IDispatch;
  subscription: ISubscription;
  onClose: () => void;
}

export function ProgramPreviewMusclesModal(props: IProgramPreviewMusclesModalProps): JSX.Element {
  let points: IPoints | undefined;
  let name = "";
  if (props.muscles.type === "program") {
    points = Muscle_normalizePoints(Muscle_getPointsForProgram(props.program, props.stats, props.settings));
    name = props.program.name;
  } else {
    const programDay = Program_getProgramDay(props.program, props.muscles.dayIndex + 1);
    if (programDay) {
      points = Muscle_normalizePoints(Muscle_getPointsForDay(props.program, programDay, props.stats, props.settings));
      name = programDay.name;
    }
  }
  if (!points || !name) {
    return <></>;
  }
  const title =
    props.muscles.type === "program" ? `Muscles for program '${props.program.name}'` : `Muscles for day '${name}'`;

  return (
    <Modal
      shouldShowClose={true}
      onClose={props.onClose}
      isFullWidth={true}
      overflowHidden={props.dispatch && !Subscriptions_hasSubscription(props.subscription)}
    >
      {props.dispatch && (
        <Locker topic="Muscles" dispatch={props.dispatch} blur={8} subscription={props.subscription} />
      )}
      <Text className="pb-2 text-xl font-bold text-center">{title}</Text>
      <MusclesView settings={props.settings} points={points} title={props.program.name} />
    </Modal>
  );
}
