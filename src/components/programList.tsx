import { h, JSX, Fragment } from "preact";
import { Program, IProgramId, IProgram2 } from "../models/program";
import { Button } from "./button";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { IconDelete } from "./iconDelete";
import { IconEdit } from "./iconEdit";
import { IDispatch } from "../ducks/types";
import { lb } from "../utils/lens";
import { IState } from "../ducks/reducer";
import { Screen } from "../models/screen";

interface IProps {
  onSelectProgram: (id: IProgramId) => void;
  onCreateProgram: () => void;
  programs?: IProgram2[];
  dispatch: IDispatch;
}

export function ProgramListView(props: IProps): JSX.Element {
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
          <GroupHeader name="Custom Programs" />
          {programs.map((program) => (
            <MenuItem
              name={program.name}
              value={
                <Fragment>
                  <button
                    className="p-2 align-middle"
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
                    className="p-2 align-middle"
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
    </section>
  );
}
