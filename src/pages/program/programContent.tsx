import { lb } from "lens-shmens";
import { h, JSX, Fragment } from "preact";
import { DraggableList } from "../../components/draggableList";
import { basicBeginnerProgram } from "../../programs/basicBeginnerProgram";
import { IProgram } from "../../types";
import { useLensReducer } from "../../utils/useLensReducer";
import { BuilderLinkInlineInput } from "../builder/components/builderInlineInput";
import { IProgramEditorState } from "./models/types";
import { IconWatch } from "../../components/icons/iconWatch";
import { TimeUtils } from "../../utils/time";
import { Program } from "../../models/program";
import { Settings } from "../../models/settings";
import { IconHandle } from "../../components/icons/iconHandle";
import { EditProgramLenses } from "../../models/editProgramLenses";
import { LinkButton } from "../../components/linkButton";
import { StringUtils } from "../../utils/string";
import { ProgramContentExercise } from "./components/programContentExercise";
import { ProgramContentEditExercise } from "./components/programContentEditExercise";
import { GroupHeader } from "../../components/groupHeader";

export interface IProgramContentProps {
  client: Window["fetch"];
  program?: IProgram;
}

export function ProgramContent(props: IProgramContentProps): JSX.Element {
  const initialState: IProgramEditorState = {
    settings: Settings.build(),
    program: props.program ||
      basicBeginnerProgram || {
        id: "My Program",
        name: "My Program",
        url: "",
        author: "",
        shortDescription: "",
        description: "",
        nextDay: 1,
        days: [{ name: "Day 1", exercises: [] }],
        exercises: [],
        tags: [],
      },
    editExercises: {},
  };
  const [state, dispatch] = useLensReducer(initialState, { client: props.client });
  const assignedExerciseIds = new Set(state.program.days.flatMap((d) => d.exercises.map((e) => e.id)));
  const unassignedExercises = state.program.exercises.filter((e) => !assignedExerciseIds.has(e.id));
  return (
    <section className="px-4 py-2">
      <div>
        <h1 className="pb-4 text-2xl font-bold">
          <BuilderLinkInlineInput
            value={state.program.name}
            onInputString={(v) => {
              dispatch(lb<IProgramEditorState>().p("program").p("name").record(v));
            }}
          />
        </h1>
        <DraggableList
          hideBorders={true}
          items={state.program.days}
          element={(day, i, handleTouchStart) => {
            const approxDayTime = TimeUtils.formatHHMM(Program.dayApproxTimeMs(i, state.program, state.settings));
            return (
              <section className="flex w-full px-2 py-1 text-left">
                <div className="flex flex-col">
                  <div className="p-2 cursor-move" style={{ marginLeft: "-16px", touchAction: "none" }}>
                    <span onMouseDown={handleTouchStart} onTouchStart={handleTouchStart}>
                      <IconHandle />
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="h-full bg-grayv2-200" style={{ width: "1px" }} />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="flex items-center" style={{ height: "2.25rem" }}>
                    <span className="text-xl">{day.name}</span>
                    <span className="ml-2">{day.exercises.length} exercises</span>
                    <div>
                      <IconWatch className="mb-1 align-middle" />
                      <span className="pl-1 align-middle">{approxDayTime}h</span>
                    </div>
                  </h2>
                  <DraggableList
                    hideBorders={true}
                    items={day.exercises}
                    element={(dayExercise, i2, handleTouchStart2) => {
                      const programExercise = Program.getProgramExerciseById(state.program, dayExercise.id);
                      if (!programExercise) {
                        return <></>;
                      }
                      const editProgramExercise = state.editExercises[programExercise.id];
                      if (editProgramExercise) {
                        return (
                          <ProgramContentEditExercise
                            programExercise={editProgramExercise}
                            program={state.program}
                            settings={state.settings}
                            dispatch={dispatch}
                          />
                        );
                      } else {
                        return (
                          <ProgramContentExercise
                            programExercise={programExercise}
                            dayIndex={i}
                            handleTouchStart={handleTouchStart2}
                            program={state.program}
                            settings={state.settings}
                            dispatch={dispatch}
                          />
                        );
                      }
                    }}
                    onDragEnd={(startIndex, endIndex) =>
                      dispatch(
                        EditProgramLenses.reorderExercises(
                          lb<IProgramEditorState>().p("program"),
                          i,
                          startIndex,
                          endIndex
                        )
                      )
                    }
                  />
                </div>
              </section>
            );
          }}
          onDragEnd={(startIndex, endIndex) =>
            dispatch(EditProgramLenses.reorderDays(lb<IProgramEditorState>().p("program"), startIndex, endIndex))
          }
        />
        <LinkButton
          onClick={() => {
            dispatch(
              lb<IProgramEditorState>()
                .p("program")
                .p("days")
                .recordModify((days) => {
                  return [
                    ...days,
                    Program.createDay(StringUtils.nextName(state.program.days[state.program.days.length - 1].name)),
                  ];
                })
            );
          }}
        >
          Add new day
        </LinkButton>
      </div>
      {unassignedExercises.length > 0 && (
        <div>
          <GroupHeader topPadding={true} name="Unassigned exercises" />
          {unassignedExercises.map((programExercise) => {
            const editProgramExercise = state.editExercises[programExercise.id];
            if (editProgramExercise) {
              return (
                <ProgramContentEditExercise
                  programExercise={editProgramExercise}
                  program={state.program}
                  settings={state.settings}
                  dispatch={dispatch}
                />
              );
            } else {
              return (
                <ProgramContentExercise
                  programExercise={programExercise}
                  program={state.program}
                  settings={state.settings}
                  dispatch={dispatch}
                />
              );
            }
          })}
        </div>
      )}
    </section>
  );
}
