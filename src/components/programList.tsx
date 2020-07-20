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
import { Screen } from "../models/screen";
import { HtmlUtils } from "../utils/html";

interface IProps {
  onCreateProgram: () => void;
  programs: IProgram[];
  customPrograms?: IProgram[];
  dispatch: IDispatch;
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
                  props.dispatch({
                    type: "UpdateState",
                    lensRecording: [
                      lb<IState>().p("storage").p("currentProgramId").record(program.id),
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
                          lb<IState>().p("editProgram").record({ id: program.id }),
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

      <div className="p-2 text-center">
        <Button kind="green" onClick={() => props.onCreateProgram()}>
          Create new program
        </Button>
      </div>

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
    </section>
  );
}
