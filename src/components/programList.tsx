import { h, JSX, Fragment } from "preact";
import { Program } from "../models/program";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { IDispatch } from "../ducks/types";
import { HtmlUtils } from "../utils/html";
import { IProgram, ISettings, IEquipment } from "../types";
import { CollectionUtils } from "../utils/collection";
import { IconArrowRight } from "./icons/iconArrowRight";
import { LinkButton } from "./linkButton";
import { useState } from "preact/compat";
import { IconTrash } from "./icons/iconTrash";
import { IconEditSquare } from "./icons/iconEditSquare";
import { Exercise, IExercise } from "../models/exercise";
import { ObjectUtils } from "../utils/object";
import { ExerciseImage } from "./exerciseImage";
import { TimeUtils } from "../utils/time";
import { IconWatch } from "./icons/iconWatch";
import { ExerciseImageUtils } from "../models/exerciseImage";
import { EditProgram } from "../models/editProgram";
import { IconDoc } from "./icons/iconDoc";
import { StringUtils } from "../utils/string";

interface IProps {
  onSelectProgram: (id: string) => void;
  programs: IProgram[];
  customPrograms?: IProgram[];
  settings: ISettings;
  dispatch: IDispatch;
  editProgramId?: string;
}

export function ProgramListView(props: IProps): JSX.Element {
  const customPrograms = CollectionUtils.sort(props.customPrograms || [], (a, b) => a.name.localeCompare(b.name));
  const programs = props.programs;

  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <div className="px-4">
      {customPrograms.length === 0 && (
        <p className="px-8 py-2 text-sm text-center text-grayv2-700">
          If you're new to weight lifting, consider starting with <strong>Basic Beginner Routine</strong>.
        </p>
      )}
      {customPrograms.length > 0 && (
        <div className="mb-4">
          <GroupHeader
            name="Your Programs"
            rightAddOn={
              <LinkButton
                name="edit-your-programs"
                onClick={() => {
                  setIsEditMode(!isEditMode);
                }}
              >
                {isEditMode ? "Finish Editing" : "Edit"}
              </LinkButton>
            }
          />
          {customPrograms.map((program) => (
            <MenuItem
              name={program.name}
              onClick={(e) => {
                if (!isEditMode && !HtmlUtils.classInParents(e.target as Element, "button")) {
                  Program.selectProgram(props.dispatch, program.id);
                }
              }}
              value={
                isEditMode ? (
                  <Fragment>
                    <button
                      className="p-2 align-middle button nm-program-list-edit-program"
                      onClick={() => {
                        if (props.editProgramId == null || props.editProgramId !== program.id) {
                          Program.editAction(props.dispatch, program.id);
                        } else {
                          alert("You cannot edit the program while that program's workout is in progress");
                        }
                      }}
                    >
                      <IconEditSquare />
                    </button>
                    <button
                      className="p-2 align-middle button nm-program-list-delete-program ls-delete-program"
                      onClick={() => {
                        if (customPrograms.length < 2) {
                          alert("You cannot delete all your programs, you should have at least one");
                        } else if (props.editProgramId == null || props.editProgramId !== program.id) {
                          if (confirm("Are you sure?")) {
                            EditProgram.deleteProgram(props.dispatch, program, customPrograms);
                          }
                        } else {
                          alert("You cannot delete the program while that program's workout is in progress");
                        }
                      }}
                    >
                      <IconTrash />
                    </button>
                  </Fragment>
                ) : (
                  <span className="inline-block">
                    <IconArrowRight />
                  </span>
                )
              }
            />
          ))}
        </div>
      )}

      {programs.length > 0 && (
        <Fragment>
          {props.customPrograms && props.customPrograms.length > 0 ? (
            <GroupHeader name="Or clone from built-in programs" />
          ) : null}
          <div className="pt-2">
            {programs.map((program) => (
              <BuiltInProgram
                settings={props.settings}
                program={program}
                onClick={() => {
                  props.onSelectProgram(program.id);
                }}
              />
            ))}
          </div>
        </Fragment>
      )}
    </div>
  );
}

interface IBuiltInProgramProps {
  program: IProgram;
  settings: ISettings;
  onClick: () => void;
}

function BuiltInProgram(props: IBuiltInProgramProps): JSX.Element {
  const program = props.program.weeks.length === 0 ? Program.fullProgram(props.program, props.settings) : props.program;
  const exerciseObj: Partial<Record<string, IExercise>> = {};
  const equipmentSet: Set<IEquipment | undefined> = new Set();
  for (const day of program.days) {
    for (const ex of day.exercises) {
      const programExercise = Program.getProgramExerciseById(program, ex.id);
      if (programExercise) {
        const exercise = Exercise.find(programExercise.exerciseType, props.settings.exercises);
        if (exercise) {
          exerciseObj[Exercise.toKey(programExercise.exerciseType)] = exercise;
          if (exercise.equipment !== "bodyweight") {
            equipmentSet.add(exercise.equipment);
          }
        }
      }
    }
  }
  const exercises = CollectionUtils.nonnull(ObjectUtils.values(exerciseObj));
  const equipment = CollectionUtils.nonnull(Array.from(equipmentSet));
  const time = Program.dayAverageTimeMs(program, props.settings);
  const formattedTime = time > 0 ? TimeUtils.formatHHMM(time) : undefined;

  return (
    <button
      className="relative flex items-center w-full p-3 mb-4 text-left bg-orange-100 rounded-lg nm-program-list-choose-program"
      style={{ boxShadow: "0 0 8px 0 rgb(142 140 0 / 25%)" }}
      onClick={props.onClick}
    >
      <div className="flex-1">
        <div className="flex items-center">
          <h3 className="flex-1 mr-2 text-lg font-bold">{program.name}</h3>
          {formattedTime && (
            <div>
              <IconWatch className="mb-1 align-middle" />
              <span className="pl-1 align-middle">{formattedTime}h</span>
            </div>
          )}
        </div>
        <div className="py-1 text-grayv2-main">
          <IconDoc width={15} height={20} color="#607284" />{" "}
          <span className="align-middle">
            {program.isMultiweek && `${program.weeks.length} ${StringUtils.pluralize("week", program.weeks.length)}, `}
            {Program.daysRange(program)}, {Program.exerciseRange(program)}
          </span>
        </div>
        <h4 className="text-sm text-grayv2-main">{program.shortDescription}</h4>
        <div className="py-3">
          {exercises
            .filter((e) => ExerciseImageUtils.exists(e, "small"))
            .map((e) => (
              <ExerciseImage settings={props.settings} exerciseType={e} size="small" className="w-6 mr-1" />
            ))}
        </div>
        <div className="text-xs">
          <span>Equipment: </span>
          {equipment.map((e, i) => {
            return (
              <>
                {i !== 0 && <>, </>}
                <span className="font-bold">{e}</span>
              </>
            );
          })}
        </div>
      </div>
    </button>
  );
}
