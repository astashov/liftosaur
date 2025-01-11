import { IDispatch } from "../ducks/types";
import { IProgram, ISettings, ISubscription, IExerciseType } from "../types";
import { IconMuscles2 } from "./icons/iconMuscles2";
import { useState } from "react";
import { IPoints, Muscle } from "../models/muscle";
import { LftModal } from "./modal";
import { MusclesView } from "./muscles/musclesView";
import { ModalExerciseInfo } from "./modalExerciseInfo";
import { Locker } from "./locker";
import { Subscriptions } from "../utils/subscriptions";
import { Program } from "../models/program";
import { TimeUtils } from "../utils/time";
import { IconWatch } from "./icons/iconWatch";
import { ProgramPreviewOrPlayground } from "./programPreviewOrPlayground";
import { IconDoc } from "./icons/iconDoc";
import { StringUtils } from "../utils/string";

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
  hasNavbar?: boolean;
}

export function ProgramPreview(props: IProps): JSX.Element {
  const program = Program.fullProgram(props.program, props.settings);
  const [musclesModal, setMusclesModal] = useState<IPreviewProgramMuscles | undefined>(undefined);
  const [exerciseTypeInfo, setExerciseTypeInfo] = useState<IExerciseType | undefined>(undefined);

  return (
    <div>
      <div className="flex items-center pt-2">
        <h2 data-cy="program-name" className="flex-1 text-2xl font-bold leading-tight">
          {program.url ? (
            <a className="underline text-bluev2" target="_blank" href={program.url}>
              {program.name}
            </a>
          ) : (
            <span>{program.name}</span>
          )}
        </h2>
        <div>
          <button
            data-cy="program-show-muscles"
            className="p-2 align-middle nm-program-preview-muscles"
            onClick={() => setMusclesModal({ type: "program" })}
          >
            <IconMuscles2 />
          </button>
        </div>
      </div>
      {program.author && (
        <h3 data-cy="program-author" className="text-sm font-bold uppercase text-grayv2-main">
          By {program.author}
        </h3>
      )}
      <div className="py-1">
        <IconWatch />{" "}
        <span className="align-middle">
          Average time to finish a workout:{" "}
          <strong>{TimeUtils.formatHHMM(Program.dayAverageTimeMs(program, props.settings))}</strong>
        </span>
      </div>
      <div className="py-1 text-grayv2-main">
        <IconDoc width={15} height={20} color="#607284" />{" "}
        <span className="align-middle">
          {program.isMultiweek && `${program.weeks.length} ${StringUtils.pluralize("week", program.weeks.length)}, `}
          {Program.daysRange(program)}, {Program.exerciseRange(program)}
        </span>
      </div>
      {program.description && (
        <div className="pt-2 program-description" dangerouslySetInnerHTML={{ __html: program.description }} />
      )}
      <ProgramPreviewOrPlayground
        program={program}
        settings={props.settings}
        isMobile={props.isMobile}
        hasNavbar={props.hasNavbar}
      />
      {musclesModal && (
        <ProgramPreviewMusclesModal
          muscles={musclesModal}
          onClose={() => setMusclesModal(undefined)}
          program={program}
          subscription={props.subscription}
          dispatch={props.dispatch}
          settings={props.settings}
        />
      )}
      {exerciseTypeInfo && (
        <ModalExerciseInfo
          settings={props.settings}
          isHidden={exerciseTypeInfo == null}
          exerciseType={exerciseTypeInfo}
          onClose={() => setExerciseTypeInfo(undefined)}
        />
      )}
    </div>
  );
}

interface IProgramPreviewMusclesModalProps {
  muscles: IPreviewProgramMuscles;
  program: IProgram;
  settings: ISettings;
  dispatch?: IDispatch;
  subscription: ISubscription;
  onClose: () => void;
}

export function ProgramPreviewMusclesModal(props: IProgramPreviewMusclesModalProps): JSX.Element {
  let points: IPoints;
  if (props.muscles.type === "program") {
    points = Muscle.normalizePoints(Muscle.getPointsForProgram(props.program, props.settings));
  } else {
    const day = props.program.days[props.muscles.dayIndex];
    points = Muscle.normalizePoints(Muscle.getPointsForDay(props.program, day, props.settings));
  }
  const title =
    props.muscles.type === "program"
      ? `Muscles for program '${props.program.name}'`
      : `Muscles for day '${props.program.days[props.muscles.dayIndex].name}'`;

  return (
    <LftModal
      shouldShowClose={true}
      onClose={props.onClose}
      isFullWidth={true}
      overflowHidden={props.dispatch && !Subscriptions.hasSubscription(props.subscription)}
    >
      {props.dispatch && (
        <Locker topic="Muscles" dispatch={props.dispatch} blur={8} subscription={props.subscription} />
      )}
      <h2 className="pb-2 text-xl font-bold text-center">{title}</h2>
      <MusclesView settings={props.settings} points={points} title={props.program.name} />
    </LftModal>
  );
}
