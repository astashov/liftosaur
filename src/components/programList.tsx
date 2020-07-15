import { h, JSX, Fragment } from "preact";
import { Program, IProgram2, IProgramId } from "../models/program";
import { Button } from "./button";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { IconDelete } from "./iconDelete";
import { IconEdit } from "./iconEdit";
import { IDispatch } from "../ducks/types";
import { lb } from "../utils/lens";
import { IState } from "../ducks/reducer";
import { Screen } from "../models/screen";
import { HtmlUtils } from "../utils/html";

interface IProps {
  onSelectProgram: (id: IProgramId) => void;
  onCreateProgram: () => void;
  editingProgramName?: string;
  programs: IProgram2[];
  customPrograms?: IProgram2[];
  dispatch: IDispatch;
}

export function ProgramListView(props: IProps): JSX.Element {
  const customPrograms = props.customPrograms || [];
  const programs = props.programs || [];
  return (
    <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
      <GroupHeader name="Built-in programs" />
      {Program.all().map((program) => (
        <button className="w-full p-4 border-b border-gray-200" onClick={() => props.onSelectProgram(program.id)}>
          {program.name}
        </button>
      ))}
      {programs.length > 0 && (
        <Fragment>
          <GroupHeader name="Programs to clone from" />
          {programs.map((program) => (
            <button
              className="w-full p-4 border-b border-gray-200"
              onClick={() => {
                if (
                  confirm(
                    `Do you want to clone the program ${program.name}? After cloning you'll be able to select it and follow it.`
                  )
                ) {
                  Program.cloneProgram2(props.dispatch, program);
                }
              }}
            >
              {program.name}
            </button>
          ))}
        </Fragment>
      )}
      {customPrograms.length > 0 && (
        <Fragment>
          <GroupHeader name="Your Programs" />
          {customPrograms.map((program) => (
            <MenuItem
              name={program.name}
              onClick={(e) => {
                if (!HtmlUtils.classInParents(e.target as Element, "button")) {
                  props.dispatch({
                    type: "UpdateState",
                    lensRecording: [
                      lb<IState>().p("storage").p("currentProgram2Id").record(program.id),
                      lb<IState>()
                        .p("screenStack")
                        .recordModify((s) => Screen.push(s, "main")),
                    ],
                  });
                }
              }}
              value={
                <Fragment>
                  <button
                    className="p-2 align-middle button"
                    onClick={() => {
                      props.dispatch({
                        type: "UpdateState",
                        lensRecording: [
                          lb<IState>().p("editProgram").record({ program }),
                          lb<IState>()
                            .p("screenStack")
                            .recordModify((s) => Screen.push(s, "editProgram")),
                        ],
                      });
                    }}
                  >
                    <IconEdit />
                  </button>
                  <button
                    className="p-2 align-middle button"
                    onClick={() => {
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

      {props.editingProgramName && (
        <div className="p-2 text-center">
          <Button kind="blue" onClick={() => props.dispatch({ type: "PushScreen", screen: "editProgram" })}>
            Continue editing {props.editingProgramName}
          </Button>
        </div>
      )}
      <div className="p-2 text-center">
        <Button kind="green" onClick={() => props.onCreateProgram()}>
          Create new program
        </Button>
      </div>
    </section>
  );
}
