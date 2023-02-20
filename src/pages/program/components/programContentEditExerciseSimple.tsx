import { lb, LensBuilder, lbu } from "lens-shmens";
import { h, JSX } from "preact";
import { EditProgramExerciseSimpleProgression } from "../../../components/editProgram/editProgramExerciseSimpleProgression";
import { EditProgramExerciseSimpleRow } from "../../../components/editProgram/editProgramExerciseSimpleRow";
import { EditProgramLenses } from "../../../models/editProgramLenses";
import { Program } from "../../../models/program";
import { ProgramExercise } from "../../../models/programExercise";
import { IHistoryRecord, IProgram, IProgramExercise, ISettings } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IProgramEditorState } from "../models/types";
import { ProgramContentPlayground } from "./programContentPlayground";
import { EditProgramExerciseSimpleErrors } from "../../../components/editProgram/editProgramExerciseSimpleErrors";
import { Button } from "../../../components/button";
import { EditExerciseUtil } from "../utils/editExerciseUtil";
import { CollectionUtils } from "../../../utils/collection";

interface IProgramContentEditExerciseSimpleProps {
  dispatch: ILensDispatch<IProgramEditorState>;
  lbe: LensBuilder<IProgramEditorState, IProgramExercise, {}>;
  program: IProgram;
  dayIndex?: number;
  programExercise: IProgramExercise;
  progress?: IHistoryRecord;
  settings: ISettings;
  isChanged: boolean;
  onProgressChange: (progress: IHistoryRecord) => void;
}

export function ProgramContentEditExerciseSimple(props: IProgramContentEditExerciseSimpleProps): JSX.Element {
  const { programExercise, program, settings, lbe, progress } = props;
  const allProgramExercises = program.exercises;
  const entry = progress?.entries[0];
  const isEligibleForSimple = Program.isEligibleForSimpleExercise(props.programExercise);
  if (!isEligibleForSimple.success) {
    return <EditProgramExerciseSimpleErrors errors={isEligibleForSimple.error} />;
  }

  return (
    <div>
      <div className="flex" style={{ gap: "0.5rem" }}>
        <div className="flex-1 min-w-0">
          <section className="px-4 py-2 mt-8 bg-purple-100 rounded-2xl">
            <EditProgramExerciseSimpleRow
              programExercise={programExercise}
              allProgramExercises={allProgramExercises}
              settings={settings}
              onChange={(sets, reps, weight) => {
                if (sets != null && reps != null && weight != null) {
                  props.dispatch(EditProgramLenses.updateSimpleExercise(lbe, settings.units, sets, reps, weight));
                }
              }}
            />
            <EditProgramExerciseSimpleProgression
              settings={props.settings}
              onUpdate={(progression, deload) => {
                props.dispatch(EditProgramLenses.setProgression(lbe, progression, deload));
              }}
              finishDayExpr={ProgramExercise.getFinishDayScript(programExercise, allProgramExercises)}
            />
          </section>
        </div>
        <div className="flex-1">
          {progress && entry && (
            <ProgramContentPlayground
              hideDay={true}
              day={0}
              programExercise={programExercise}
              allProgramExercises={allProgramExercises}
              progress={progress}
              settings={props.settings}
              days={props.program.days}
              lbe={props.lbe}
              dispatch={props.dispatch}
              onProgressChange={props.onProgressChange}
            />
          )}
        </div>
      </div>
      <div className="p-2 mb-4 text-center">
        <Button
          className="mr-2"
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
          kind="grayv2"
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            const getters = {
              editExercise: lbe.get(),
            };
            props.dispatch([
              lbu<IProgramEditorState, typeof getters>(getters)
                .p("current")
                .p("program")
                .p("exercises")
                .recordModify((exercises, { editExercise }) => {
                  if (editExercise) {
                    return CollectionUtils.setBy(exercises, "id", programExercise.id, editExercise);
                  } else {
                    return exercises;
                  }
                }),
              lb<IProgramEditorState>()
                .p("current")
                .p("editExercises")
                .p(EditExerciseUtil.getKey(programExercise.id, props.dayIndex))
                .record(undefined),
            ]);
          }}
          kind="orange"
        >
          Save
        </Button>
      </div>
    </div>
  );
}
