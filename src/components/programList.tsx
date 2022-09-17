import { h, JSX, Fragment } from "preact";
import { Program } from "../models/program";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import { HtmlUtils } from "../utils/html";
import { IState } from "../models/state";
import { IProgram } from "../types";
import { CollectionUtils } from "../utils/collection";
import { IconArrowRight } from "./iconArrowRight";
import { LinkButton } from "./linkButton";
import { useState } from "preact/compat";
import { IconTrash } from "./iconTrash";
import { IconEditSquare } from "./iconEditSquare";

interface IProps {
  onSelectProgram: (id: string) => void;
  programs: IProgram[];
  customPrograms?: IProgram[];
  dispatch: IDispatch;
  editProgramId?: string;
}

export function ProgramListView(props: IProps): JSX.Element {
  const customPrograms = CollectionUtils.sort(props.customPrograms || [], (a, b) => a.name.localeCompare(b.name));
  const programs = CollectionUtils.sort(props.programs || [], (a, b) => a.name.localeCompare(b.name));

  const [isEditMode, setIsEditMode] = useState(false);

  const tagToColor = {
    "first-starter": "text-orange-700",
    beginner: "text-orange-700",
    barbell: "text-green-700",
    dumbbell: "text-green-700",
    intermediate: "text-orange-700",
    woman: "text-pink-700",
    ppl: "text-orange-700",
    hypertrophy: "text-blue-700",
  };

  return (
    <Fragment>
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
                      className="p-2 align-middle button"
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
                      className="p-2 align-middle button"
                      onClick={() => {
                        if (props.editProgramId == null || props.editProgramId !== program.id) {
                          if (confirm("Are you sure?")) {
                            props.dispatch({
                              type: "UpdateState",
                              lensRecording: [
                                lb<IState>()
                                  .p("storage")
                                  .p("programs")
                                  .recordModify((pgms) => pgms.filter((p) => p.id !== program.id)),
                              ],
                            });
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
          {programs.map((program) => (
            <div className="px-4">
              <button
                className="relative flex items-center w-full py-3 text-left border-b border-gray-200"
                onClick={() => props.onSelectProgram(program.id)}
              >
                <div className="flex-1">
                  <span>{program.name}</span>
                  <div>
                    {program.tags.map((tag) => (
                      <span
                        className={`inline-block mr-2 my-0 text-xs text-white whitespace-no-wrap rounded-full ${
                          tagToColor[tag] || "bg-red-700"
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right" style={{ lineHeight: "1em" }}>
                  <IconArrowRight />
                </div>
              </button>
            </div>
          ))}
        </Fragment>
      )}
    </Fragment>
  );
}
