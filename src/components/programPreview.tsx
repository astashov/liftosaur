import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { IProgram, IProgramExercise, ISettings, ISubscription, IExerciseType, IDayData } from "../types";
import { GroupHeader } from "./groupHeader";
import { IconMuscles2 } from "./icons/iconMuscles2";
import { ExerciseImage } from "./exerciseImage";
import { RepsAndWeight } from "../pages/programs/programDetails/programDetailsValues";
import { IDeload, IProgression, Progression } from "../models/progression";
import { ProgramExercise } from "../models/programExercise";
import { useState } from "preact/hooks";
import { memo } from "preact/compat";
import { IconFx } from "./icons/iconFx";
import { IconSquare5 } from "./icons/iconSquare5";
import Prism from "prismjs";
import { Playground } from "../pages/programs/programDetails/programDetailsPlayground";
import { IPoints, Muscle } from "../models/muscle";
import { Modal } from "./modal";
import { MusclesView } from "./muscles/musclesView";
import { LinkButton } from "./linkButton";
import { ModalExerciseInfo } from "./modalExerciseInfo";
import { StringUtils } from "../utils/string";
import { Locker } from "./locker";
import { Subscriptions } from "../utils/subscriptions";
import { Program } from "../models/program";
import { TimeUtils } from "../utils/time";
import { IconWatch } from "./icons/iconWatch";
import { Progress } from "../models/progress";

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
  subscription: ISubscription;
}

export function ProgramPreview(props: IProps): JSX.Element {
  const program = props.program;
  const [showFx, setShowFx] = useState(false);
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
          <button data-cy="program-show-fx" className="p-2 align-middle" onClick={() => setShowFx(!showFx)}>
            <IconFx color={showFx ? "#FF8066" : "#171718"} />
          </button>
          <button
            data-cy="program-show-muscles"
            className="p-2 align-middle"
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
      {program.description && <div className="pt-2" dangerouslySetInnerHTML={{ __html: program.description }} />}
      <GroupHeader name="Days and Exercises" topPadding={true} />
      {program.days.map((day, i) => {
        const dayIndex = i + 1;
        const dayData = Program.getDayData(program, dayIndex);
        return (
          <section data-cy={`day-${dayIndex}`} className="pb-4">
            <div className="flex items-center">
              <h2 data-cy="program-day-name" className="flex-1 text-2xl text-gray-600">
                {dayIndex}. {day.name}
              </h2>
              <div>
                <button
                  style={{ marginRight: "-0.5rem" }}
                  data-cy="program-show-day-muscles"
                  className="p-2"
                  onClick={() => setMusclesModal({ type: "day", dayIndex: dayIndex - 1 })}
                >
                  <IconMuscles2 />
                </button>
              </div>
            </div>
            <div className="pb-2">
              <IconWatch />{" "}
              <span className="align-middle">
                Approximate time to finish:{" "}
                <strong>{TimeUtils.formatHHMM(Program.dayApproxTimeMs(dayData, program, props.settings))}</strong>
              </span>
            </div>
            <ul>
              {day.exercises.map((dayEntry, index) => {
                const programExercise = program.exercises.find((e) => e.id === dayEntry.id);
                if (programExercise) {
                  return (
                    <ProgramPreviewExercise
                      key={`${program.id}_${showFx}`}
                      programExercise={programExercise}
                      programId={program.id}
                      allProgramExercises={program.exercises}
                      subscription={props.subscription}
                      programExerciseIndex={index}
                      dayData={dayData}
                      settings={props.settings}
                      shouldShowAllFormulas={showFx}
                      onExerciseTypeClick={(exerciseType) => setExerciseTypeInfo(exerciseType)}
                    />
                  );
                } else {
                  return null;
                }
              })}
            </ul>
          </section>
        );
      })}
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

interface IProgramPreviewExerciseProps {
  programExercise: IProgramExercise;
  allProgramExercises: IProgramExercise[];
  programExerciseIndex: number;
  programId: string;
  dayData: IDayData;
  subscription: ISubscription;
  settings: ISettings;
  shouldShowAllFormulas: boolean;
  onExerciseTypeClick: (exerciseType: IExerciseType) => void;
}

function ProgramPreviewExercise(props: IProgramPreviewExerciseProps): JSX.Element {
  const { programExerciseIndex, settings } = props;
  const [programExercise, setProgramExercise] = useState(props.programExercise);
  const [showPlayground, setShowPlayground] = useState(false);
  const [showScripts, setShowScripts] = useState(props.shouldShowAllFormulas);
  const reusedProgramExercise = ProgramExercise.getReusedProgramExercise(programExercise, props.allProgramExercises);
  const variations = ProgramExercise.getVariations(programExercise, props.allProgramExercises);
  const timerExpr = ProgramExercise.getTimerExpr(programExercise, props.allProgramExercises);
  const finishDayScript = ProgramExercise.getFinishDayScript(programExercise, props.allProgramExercises);
  const progression = Progression.getProgression(finishDayScript);
  const deload = Progression.getDeload(finishDayScript);

  const timer = timerExpr?.trim()
    ? Progress.executeEntryScript(
        timerExpr,
        props.dayData,
        ProgramExercise.getState(props.programExercise, props.allProgramExercises),
        { equipment: props.programExercise.exerciseType.equipment },
        props.settings,
        "timer"
      )
    : undefined;

  return (
    <li className="pb-4" id={programExercise.id} data-cy={StringUtils.dashcase(programExercise.name)}>
      <div className="flex w-full">
        <div
          className="pr-4"
          onClick={() => props.onExerciseTypeClick(programExercise.exerciseType)}
          style={{ minWidth: "6.5em", width: "6.5em" }}
        >
          <ExerciseImage
            settings={props.settings}
            exerciseType={programExercise.exerciseType}
            size="small"
            className="w-full"
          />
        </div>
        <div className="flex flex-1">
          <div className="flex-1">
            <div className="flex items-center">
              <h3 data-cy="program-exercise-name" className="flex-1 text-lg font-bold">
                {programExerciseIndex + 1}. {programExercise.name}
              </h3>
              <div style={{ marginRight: "-0.5rem" }}>
                <button data-cy="program-exercise-show-fx" className="p-2" onClick={() => setShowScripts(!showScripts)}>
                  <IconFx color={showScripts ? "#FF8066" : "#171718"} />
                </button>
                <button
                  data-cy="program-exercise-show-playground"
                  className="p-2"
                  onClick={() => setShowPlayground(!showPlayground)}
                >
                  <IconSquare5 color={showPlayground ? "#FF8066" : "#171718"} />
                </button>
              </div>
            </div>
            <h4
              data-cy="program-exercise-equipment"
              style={{ marginTop: "-0.25rem" }}
              className="pb-2 text-sm text-grayv2-main"
            >
              {StringUtils.capitalize(programExercise.exerciseType.equipment || "bodyweight")}
            </h4>
            {variations.map((variation, variationIndex) => {
              return (
                <div className={`${variationIndex > 1 ? "pt-2" : ""}`}>
                  {variations.length > 1 && (
                    <div className="text-xs text-grayv2-main" style={{ marginBottom: "-4px" }}>
                      Variation {variationIndex + 1}
                    </div>
                  )}
                  <div>
                    <RepsAndWeight
                      sets={variation.sets}
                      programExercise={programExercise}
                      allProgramExercises={props.allProgramExercises}
                      dayData={props.dayData}
                      settings={settings}
                      shouldShowAllFormulas={props.shouldShowAllFormulas}
                      forceShowFormula={showScripts}
                    />
                  </div>
                </div>
              );
            })}
            {timer != null && !reusedProgramExercise ? (
              <div data-cy="program-exercise-timer">
                <strong>
                  <IconWatch style={{ marginTop: "-2px" }} /> Custom Rest Timer:
                </strong>{" "}
                {showScripts ? timerExpr : `${timer} sec`}
              </div>
            ) : undefined}
            <div data-cy="program-exercise-info">
              <div>
                {reusedProgramExercise && (
                  <>
                    Reused logic from{" "}
                    <LinkButton
                      onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById(reusedProgramExercise.id);
                        if (el) {
                          const top = window.pageYOffset + el.getBoundingClientRect().top - 70;
                          window.scrollTo({ top, behavior: "smooth" });
                        }
                      }}
                    >
                      {reusedProgramExercise.name}
                    </LinkButton>{" "}
                    exercise
                  </>
                )}
              </div>
              <div>{progression && <ProgressionView progression={progression} />}</div>
              <div>{deload && <DeloadView deload={deload} />}</div>
            </div>
          </div>
        </div>
      </div>
      {showScripts && <FinishDayExprView finishDayExpr={finishDayScript} />}
      {showPlayground && (
        <Playground
          programId={props.programId}
          programExercise={programExercise}
          allProgramExercises={props.allProgramExercises}
          hidePlatesCalculator={true}
          subscription={props.subscription}
          variationIndex={0}
          settings={props.settings}
          dayData={props.dayData}
          onProgramExerciseUpdate={setProgramExercise}
        />
      )}
    </li>
  );
}

export const ProgressionView = memo(
  (props: { progression: IProgression }): JSX.Element => {
    const { progression } = props;
    return (
      <span>
        Increase by <strong>{progression.increment}</strong>
        <strong>{progression.unit}</strong> after <strong>{progression.attempts}</strong> successful attempts.
      </span>
    );
  }
);

export const DeloadView = memo(
  (props: { deload: IDeload }): JSX.Element => {
    const { deload } = props;
    return (
      <span>
        Decrease by <strong>{deload.decrement}</strong>
        <strong>{deload.unit}</strong> after <strong>{deload.attempts}</strong> failed attempts.
      </span>
    );
  }
);

export const FinishDayExprView = memo((props: { finishDayExpr: string }): JSX.Element | null => {
  const highlightedCode = Prism.highlight(props.finishDayExpr, Prism.languages.javascript, "javascript");
  if (!props.finishDayExpr) {
    return null;
  }

  return (
    <div className="pt-2">
      <span className="text-sm font-bold">Finish Day Script: </span>
      <pre data-cy="finish-day-script" className="overflow-auto text-sm">
        <code class="block code language-javascript" dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
    </div>
  );
});

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
    <Modal
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
    </Modal>
  );
}
