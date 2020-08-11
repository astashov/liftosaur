import { h, JSX, Fragment } from "preact";
import { Program, IProgram } from "../models/program";
import { Button } from "./button";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { IconDelete } from "./iconDelete";
import { IconEdit } from "./iconEdit";
import { IDispatch } from "../ducks/types";
import { lb } from "../utils/lens";
import { IState } from "../ducks/reducer";
import { HtmlUtils } from "../utils/html";

interface IProps {
  onCreateProgram: () => void;
  onSelectProgram: (id: string) => void;
  programs: IProgram[];
  customPrograms?: IProgram[];
  dispatch: IDispatch;
  editProgramId?: string;
}

export function ProgramListView(props: IProps): JSX.Element {
  const customPrograms = props.customPrograms || [];
  const programs = props.programs || [];
  return (
    <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
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

      <div className="p-2 text-center">
        <Button kind="green" onClick={() => props.onCreateProgram()}>
          Create new program
        </Button>
      </div>

      {programs.length > 0 && (
        <Fragment>
          <GroupHeader name="Programs to clone from" />
          {programs.map((program) => (
            <button className="w-full p-4 border-b border-gray-200" onClick={() => props.onSelectProgram(program.id)}>
              {program.name}
            </button>
          ))}
        </Fragment>
      )}
    </section>
  );
}
