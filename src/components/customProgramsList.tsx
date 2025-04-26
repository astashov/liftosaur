import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { IEquipment, IHistoryRecord, IProgram, ISettings } from "../types";
import { IExercise, Exercise } from "../models/exercise";
import { ExerciseImageUtils } from "../models/exerciseImage";
import { Program } from "../models/program";
import { CollectionUtils } from "../utils/collection";
import { ObjectUtils } from "../utils/object";
import { StringUtils } from "../utils/string";
import { Tailwind } from "../utils/tailwindConfig";
import { ExerciseImage } from "./exerciseImage";
import { IconCalendarSmall } from "./icons/iconCalendarSmall";
import { IconKettlebellSmall } from "./icons/iconKettlebellSmall";
import { IconWatch } from "./icons/iconWatch";
import { TimeUtils } from "../utils/time";
import { IconEditSquare } from "./icons/iconEditSquare";
import { IconTrash } from "./icons/iconTrash";
import { EditProgram } from "../models/editProgram";

interface IProps {
  programs: IProgram[];
  progress?: IHistoryRecord;
  settings: ISettings;
  dispatch: IDispatch;
}

export function CustomProgramsList(props: IProps): JSX.Element {
  return (
    <>
      <div className="px-4">
        {props.programs.map((program) => {
          return (
            <CustomProgram
              programs={props.programs}
              settings={props.settings}
              progress={props.progress}
              program={program}
              dispatch={props.dispatch}
            />
          );
        })}
      </div>
    </>
  );
}

interface ICustomProgramProps {
  programs: IProgram[];
  program: IProgram;
  progress?: IHistoryRecord;
  editProgramId?: string;
  settings: ISettings;
  dispatch: IDispatch;
}

function CustomProgram(props: ICustomProgramProps): JSX.Element {
  const exerciseObj: Partial<Record<string, IExercise>> = {};
  const equipmentSet: Set<IEquipment | undefined> = new Set();
  const evaluatedProgram = Program.evaluate(props.program, props.settings);
  const allExercises = Program.getAllUsedProgramExercises(evaluatedProgram);
  for (const ex of allExercises) {
    const exercise = Exercise.find(ex.exerciseType, props.settings.exercises);
    if (exercise) {
      exerciseObj[Exercise.toKey(ex.exerciseType)] = exercise;
      if (exercise.equipment !== "bodyweight") {
        equipmentSet.add(exercise.equipment);
      }
    }
  }
  const exercises = CollectionUtils.nonnull(ObjectUtils.values(exerciseObj));
  const equipment = CollectionUtils.nonnull(Array.from(equipmentSet));
  const time = Program.dayAverageTimeMs(evaluatedProgram, props.settings);
  const formattedTime = time > 0 ? TimeUtils.formatHHMM(time) : undefined;

  return (
    <div className="relative">
      <div
        className="absolute z-10 flex items-center gap-1 px-2 py-1 leading-none border rounded-full bg-grayv3-50 border-grayv3-200"
        style={{ right: "-0.75rem", top: "-1.5rem" }}
      >
        <button
          className="block px-2 py-1 nm-custom-program-edit"
          data-cy="custom-program-edit"
          onClick={() => {
            if (props.editProgramId == null || props.editProgramId !== props.program.id) {
              Program.editAction(props.dispatch, props.program);
            } else {
              alert("You cannot edit the program while that program's workout is in progress");
            }
          }}
        >
          <IconEditSquare />
        </button>
        <button
          className="block px-2 py-1 nm-custom-program-delete"
          data-cy="custom-program-delete"
          onClick={() => {
            if (props.progress == null || props.progress.programId !== props.program.id) {
              if (confirm("Are you sure?")) {
                EditProgram.deleteProgram(props.dispatch, props.program, props.programs);
              }
            } else {
              alert("You cannot delete the program while that program's workout is in progress");
            }
          }}
        >
          <IconTrash />
        </button>
      </div>
      <button
        className="relative flex items-center w-full p-3 mt-8 mb-4 text-left border rounded-lg bg-yellowv3-50 border-yellowv3-200 nm-program-list-choose-program"
        onClick={() => {
          if (props.program.planner == null) {
            alert("Old-style programs are not supported anymore");
          } else {
            Program.selectProgram(props.dispatch, props.program.id);
          }
        }}
      >
        <div className="flex-1">
          <div className="flex items-center">
            <h3 className="flex-1 mr-2 text-base font-bold">{props.program.name}</h3>
            {formattedTime && (
              <div className="text-sm">
                <IconWatch className="mb-1 align-middle" />
                <span className="pl-1 align-middle">{formattedTime}h</span>
              </div>
            )}
          </div>
          <div className="py-3">
            {exercises
              .filter((e) => ExerciseImageUtils.exists(e, "small"))
              .map((e) => (
                <ExerciseImage settings={props.settings} exerciseType={e} size="small" className="w-6 mr-1" />
              ))}
          </div>
          <div className="flex mb-1 text-grayv2-main">
            <IconCalendarSmall color={Tailwind.colors().grayv3.main} className="block mr-1" />{" "}
            <div className="text-xs">
              {evaluatedProgram.weeks.length > 1 &&
                `${evaluatedProgram.weeks.length} ${StringUtils.pluralize("week", evaluatedProgram.weeks.length)}, `}
              {Program.daysRange(evaluatedProgram)}, {Program.exerciseRange(evaluatedProgram)}
            </div>
          </div>
          <div className="flex text-grayv2-main">
            <IconKettlebellSmall color={Tailwind.colors().grayv3.main} className="block mr-1" />{" "}
            <div className="text-xs">{equipment.join(", ")}</div>
          </div>
        </div>
      </button>
    </div>
  );
}
