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
import { IconWatch } from "./icons/iconWatch";
import { ExerciseImageUtils } from "../models/exerciseImage";
import { EditProgram } from "../models/editProgram";
import { StringUtils } from "../utils/string";
import { builtinProgramProperties } from "../models/builtinPrograms";
import { IconCalendarSmall } from "./icons/iconCalendarSmall";
import { Tailwind } from "../utils/tailwindConfig";
import { IconKettlebellSmall } from "./icons/iconKettlebellSmall";

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
                  if (program.planner == null) {
                    alert("Old-style programs are not supported anymore");
                  } else {
                    Program.selectProgram(props.dispatch, program.id);
                  }
                }
              }}
              value={
                isEditMode ? (
                  <Fragment>
                    <button
                      className="p-2 align-middle button nm-program-list-edit-program"
                      onClick={() => {
                        if (props.editProgramId == null || props.editProgramId !== program.id) {
                          Program.editAction(props.dispatch, program.id, undefined);
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
