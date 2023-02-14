import { lb } from "lens-shmens";
import { h, JSX, Fragment } from "preact";
import { DraggableList } from "../../components/draggableList";
import { basicBeginnerProgram } from "../../programs/basicBeginnerProgram";
import { IProgram, IProgramState } from "../../types";
import { useLensReducer } from "../../utils/useLensReducer";
import { BuilderLinkInlineInput } from "../builder/components/builderInlineInput";
import { IProgramEditorState } from "./models/types";
import { IconWatch } from "../../components/icons/iconWatch";
import { TimeUtils } from "../../utils/time";
import { Program } from "../../models/program";
import { Settings } from "../../models/settings";
import { IconHandle } from "../../components/icons/iconHandle";
import { ExerciseImage } from "../../components/exerciseImage";
import { ProgramExercise } from "../../models/programExercise";
import { IconDuplicate2 } from "../../components/icons/iconDuplicate2";
import { IconEditSquare } from "../../components/icons/iconEditSquare";
import { IconCloseCircleOutline } from "../../components/icons/iconCloseCircleOutline";
import { RepsAndWeight } from "../programs/programDetails/programDetailsValues";
import { ObjectUtils } from "../../utils/object";
import { Weight } from "../../models/weight";
import { EditProgramLenses } from "../../models/editProgramLenses";
import { LinkButton } from "../../components/linkButton";
import { StringUtils } from "../../utils/string";

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
    exercises: {},
  };
  const [state, dispatch] = useLensReducer(initialState, { client: props.client });
  return (
    <section className="px-4 py-2">
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
                    const approxTime = TimeUtils.formatHHMM(
                      ProgramExercise.approxTimeMs(i, programExercise, state.program.exercises, state.settings)
                    );
                    const reusedProgramExercise = ProgramExercise.getReusedProgramExercise(
                      programExercise,
                      state.program.exercises
                    );
                    const stateVars = ProgramExercise.getState(programExercise, state.program.exercises);
                    const variations = ProgramExercise.getVariations(programExercise, state.program.exercises);
                    return (
                      <div className="relative py-2">
                        <div
                          className="absolute text-xs text-grayv2-main"
                          style={{ bottom: "0.5rem", right: "0.5rem" }}
                        >
                          id: {programExercise.id}
                        </div>
                        <div
                          className="flex items-center px-4 bg-purple-100 rounded-lg"
                          style={{ boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.25)" }}
                        >
                          <div className="p-2 mr-1 cursor-move" style={{ marginLeft: "-16px", touchAction: "none" }}>
                            <span onMouseDown={handleTouchStart2} onTouchStart={handleTouchStart2}>
                              <IconHandle />
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center flex-1">
                              <div className="mr-3">
                                <ExerciseImage
                                  className="w-8"
                                  exerciseType={programExercise.exerciseType}
                                  size="small"
                                  customExercises={state.settings.exercises}
                                />
                              </div>
                              <div className="flex-1 mr-2">{programExercise!!.name}</div>
                              <div className="flex self-start">
                                <div className="p-2">
                                  <IconWatch className="mb-1 align-middle" />
                                  <span className="pl-1 align-middle">{approxTime} h</span>
                                </div>
                                <button className="p-2">
                                  <IconDuplicate2 />
                                </button>
                                <button className="p-2">
                                  <IconEditSquare />
                                </button>
                                <button className="p-2">
                                  <IconCloseCircleOutline />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div>
                                {variations.map((variation, variationIndex) => {
                                  return (
                                    <div className={`${variationIndex > 1 ? "pt-2" : ""}`}>
                                      {variations.length > 1 && (
                                        <div className="text-xs text-grayv2-main" style={{ marginBottom: "-4px" }}>
                                          Variation {variationIndex + 1}
                                        </div>
                                      )}
                                      <div>
                                        <RepsAndWeight
                                          sets={variation.sets}
                                          programExercise={programExercise}
                                          allProgramExercises={state.program.exercises}
                                          dayIndex={i}
                                          settings={state.settings}
                                          shouldShowAllFormulas={false}
                                          forceShowFormula={false}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex-1 ml-4 text-sm">
                                <div>
                                  <StateVars stateVars={stateVars} />
                                </div>
                                {reusedProgramExercise && (
                                  <div className="text-grayv2-main">Reused logic from {reusedProgramExercise.name}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
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
    </section>
  );
}

function StateVars(props: { stateVars: IProgramState }): JSX.Element {
  return (
    <>
      {ObjectUtils.keys(props.stateVars).map((key, i) => {
        const value = props.stateVars[key];
        return (
          <>
            {i !== 0 ? ", " : ""}
            <span>
              <strong>{key}</strong>: {typeof value === "number" ? value : Weight.display(value)}
            </span>
          </>
        );
      })}
    </>
  );
}
