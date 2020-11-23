import { h, JSX, Fragment } from "preact";
import { Program, IProgram } from "../models/program";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { IconDelete } from "./iconDelete";
import { IconEdit } from "./iconEdit";
import { IDispatch } from "../ducks/types";
import { lb } from "../utils/lens";
import { HtmlUtils } from "../utils/html";
import { IState } from "../models/state";

interface IProps {
  onSelectProgram: (id: string) => void;
  programs: IProgram[];
  customPrograms?: IProgram[];
  dispatch: IDispatch;
  editProgramId?: string;
}

export function ProgramListView(props: IProps): JSX.Element {
  const customPrograms = props.customPrograms || [];
  const programs = props.programs || [];

  const tagToColor = {
    "first-starter": "bg-orange-700",
    beginner: "bg-orange-700",
    barbell: "bg-green-700",
    dumbbell: "bg-green-700",
    intermediate: "bg-orange-700",
  };

  return (
    <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
      <p className="px-4 py-1 text-sm italic text-center">
        If you're new to weight lifting, consider starting with <strong>Basic Beginner Routine</strong>.
      </p>
      {customPrograms.length > 0 && (
        <Fragment>
          <GroupHeader name="Your Programs" />
          {customPrograms.map((program) => (
            <MenuItem
              name={program.name}
              onClick={(e) => {
                if (!HtmlUtils.classInParents(e.target as Element, "button")) {
                  Program.selectProgram(props.dispatch, program.id);
                }
              }}
              value={
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
                    <IconEdit size={20} lineColor="#0D2B3E" penColor="#A5B3BB" />
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
                    <IconDelete />
                  </button>
                </Fragment>
              }
            />
          ))}
        </Fragment>
      )}

      {programs.length > 0 && (
        <Fragment>
          <GroupHeader name="Programs to clone from" />
          {programs.map((program) => (
            <button
              className="relative flex items-center w-full px-6 py-4 text-left border-b border-gray-200"
              onClick={() => props.onSelectProgram(program.id)}
            >
              <span className="flex-1">{program.name}</span>
              <div className="text-right" style={{ maxWidth: "30%", lineHeight: "1em" }}>
                {program.tags.map((tag) => (
                  <span
                    className={`inline-block mx-2 my-0 text-xs text-white whitespace-no-wrap rounded-full ${
                      tagToColor[tag] || "bg-red-700"
                    }`}
                    style={{ padding: "1px 6px" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </Fragment>
      )}
    </section>
  );
}
