/* eslint-disable @typescript-eslint/ban-types */
import { lb } from "lens-shmens";
import { h, JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { ExerciseImage } from "../../../components/exerciseImage";
import { ModalExercise } from "../../../components/modalExercise";
import { Exercise, equipmentName } from "../../../models/exercise";
import { ProgramExercise } from "../../../models/programExercise";
import { IHistoryRecord, IProgram, IProgramExercise, ISettings } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IProgramEditorState } from "../models/types";
import { BuilderInlineInput } from "../../builder/components/builderInlineInput";
import { LinkButton } from "../../../components/linkButton";
import { EditProgramLenses } from "../../../models/editProgramLenses";
import { EditCustomExerciseLenses } from "../../../models/editCustomExerciseLenses";
import { IconCloseCircleOutline } from "../../../components/icons/iconCloseCircleOutline";
import { ProgramContentEditExerciseAdvanced } from "./programContentEditExerciseAdvanced";
import { Tabs2 } from "../../../components/tabs2";
import { Program } from "../../../models/program";
import { ProgramContentEditExerciseSimple } from "./programContentEditExerciseSimple";
import { EditExerciseUtil } from "../utils/editExerciseUtil";
import { Progress } from "../../../models/progress";
import { ObjectUtils } from "../../../utils/object";

interface IProps {
  settings: ISettings;
  program: IProgram;
  dayIndex?: number;
  programExercise: IProgramExercise;
  isChanged: boolean;
  dispatch: ILensDispatch<IProgramEditorState>;
}

export function ProgramContentEditExercise(props: IProps): JSX.Element {
  const { programExercise } = props;
  const allProgramExercises = props.program.exercises;

  const prevProps = useRef<IProps>(props);
  const [progress, setProgress] = useState<IHistoryRecord | undefined>(() =>
    ProgramExercise.buildProgress(programExercise, allProgramExercises, { day: 1 }, props.settings)
  );

  const [showModalExercise, setShowModalExercise] = useState<boolean>(false);
  const isEligibleForSimple = Program.isEligibleForSimpleExercise(props.programExercise).success;
  const initialTab = isEligibleForSimple ? 0 : 1;

  useEffect(() => {
    if (!ObjectUtils.isEqual(props.programExercise, prevProps.current.programExercise)) {
      setProgress(
        ProgramExercise.buildProgress(
          programExercise,
          allProgramExercises,
          progress ? Progress.getDayData(progress) : { day: 1 },
          props.settings
        )
      );
    }
    prevProps.current = props;
  });
  const exercise = Exercise.get(programExercise.exerciseType, props.settings.exercises);

  const lbe = lb<IProgramEditorState>()
    .p("current")
    .p("editExercises")
    .pi(EditExerciseUtil.getKey(programExercise.id, props.dayIndex));

  return (
    <div className="relative p-2 bg-white border rounded-lg border-purplev2-400">
      <div className="flex">
        <div>
          <ExerciseImage
            settings={props.settings}
            className="w-12 mr-3"
            exerciseType={programExercise.exerciseType}
            size="small"
          />
        </div>
        <div className="flex-1">
          <div>
            Name:{" "}
            <BuilderInlineInput
              value={programExercise.name}
              onInputString={(str) => {
                props.dispatch(lbe.p("name").record(str));
              }}
            />
          </div>
          <div>
            <div className="inline-block">
              Exercise:{" "}
              <LinkButton name="program-content-choose-exercise" onClick={() => setShowModalExercise(true)}>
                {exercise.name}
              </LinkButton>
              ,{" "}
              <span className="text-xs text-grayv2-main">{equipmentName(programExercise.exerciseType.equipment)}</span>
            </div>
          </div>
        </div>
      </div>
      <Tabs2
        defaultIndex={initialTab}
        tabs={[
          [
            "Simple Mode",
            <ProgramContentEditExerciseSimple
              isChanged={props.isChanged}
              dayIndex={props.dayIndex}
              program={props.program}
              onProgressChange={setProgress}
              programExercise={props.programExercise}
              lbe={lbe}
              progress={progress}
              settings={props.settings}
              dispatch={props.dispatch}
            />,
          ],
          [
            "Advanced Mode",
            <ProgramContentEditExerciseAdvanced
              dayIndex={props.dayIndex}
              settings={props.settings}
              programExercise={programExercise}
              isChanged={props.isChanged}
              dispatch={props.dispatch}
              lbe={lbe}
              progress={progress}
              onProgressChange={setProgress}
              program={props.program}
            />,
          ],
        ]}
      />
      <button
        className="absolute p-2 nm-program-content-edit-exercise-close-button"
        style={{ top: "0.25rem", right: "0.25rem" }}
        onClick={() => {
          if (
            !props.isChanged ||
            confirm("Are you sure? If you cancel, all your changes in this exercise would be lost")
          ) {
            props.dispatch([
              lb<IProgramEditorState>()
                .p("current")
                .p("editExercises")
                .p(EditExerciseUtil.getKey(programExercise.id, props.dayIndex))
                .record(undefined),
            ]);
          }
        }}
      >
        <IconCloseCircleOutline />
      </button>
      <ModalExercise
        shouldAddExternalLinks={true}
        isHidden={!showModalExercise}
        settings={props.settings}
        exerciseType={programExercise.exerciseType}
        onCreateOrUpdate={(
          shouldClose,
          name,
          targetMuscles,
          synergistMuscles,
          types,
          smallImageUrl,
          largeImageUrl,
          ex
        ) => {
          props.dispatch(
            EditCustomExerciseLenses.createOrUpdate(
              lb<IProgramEditorState>().p("settings"),
              name,
              targetMuscles,
              synergistMuscles,
              types,
              smallImageUrl,
              largeImageUrl,
              ex
            )
          );
        }}
        onDelete={(id) => {
          props.dispatch(EditCustomExerciseLenses.markDeleted(lb<IProgramEditorState>().p("settings"), id));
        }}
        onChange={(exerciseType, shouldClose) => {
          if (shouldClose) {
            setShowModalExercise(false);
          }
          if (exerciseType != null) {
            props.dispatch(
              EditProgramLenses.changeExercise(lbe, props.settings, programExercise.exerciseType, exerciseType)
            );
          }
        }}
      />
    </div>
  );
}
