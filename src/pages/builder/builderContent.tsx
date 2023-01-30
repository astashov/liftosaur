import { lb } from "lens-shmens";
import { h, JSX } from "preact";
import { Exercise } from "../../models/exercise";
import { useLensReducer } from "../../utils/useLensReducer";
import { BuilderModalExercise } from "./components/builderModalExercise";
import { BuilderWeek } from "./components/builderWeek";
import { IBuilderState } from "./models/builderReducer";
import { BuilderLinkInlineInput } from "./components/builderInlineInput";
import { BuilderWeekModel } from "./models/builderWeekModel";
import { LinkButton } from "../../components/linkButton";
import { StringUtils } from "../../utils/string";
import { ModalSubstitute } from "../../components/modalSubstitute";
import { ModalExercisesByMuscle } from "../../components/modalExercisesByMuscle";
import { Encoder } from "../../utils/encoder";
import { IBuilderProgram } from "./models/types";
import { BuilderExerciseModel } from "./models/builderExerciseModel";
import { ObjectUtils } from "../../utils/object";
import { useCopyPaste } from "./utils/copypaste";
import { useUndoRedo } from "./utils/undoredo";

export interface IBuilderContentProps {
  client: Window["fetch"];
  program?: IBuilderProgram;
}

export function BuilderContent(props: IBuilderContentProps): JSX.Element {
  const initialState: IBuilderState = {
    program: props.program || {
      name: "My Program",
      weeks: [BuilderWeekModel.build("Week 1")],
    },
    settings: {
      unit: "lb",
    },
    history: {
      past: [],
      future: [],
    },
    ui: {},
  };
  const [state, dispatch] = useLensReducer(initialState, { client: props.client }, [
    async (action, oldState, newState) => {
      if (oldState.program !== newState.program) {
        const string = JSON.stringify(newState.program);
        const base64data = await Encoder.encode(string);
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set("data", base64data);
        const url = new URL(window.location.href);
        url.search = urlParams.toString();
        window.history.replaceState({ path: url.toString() }, "", url.toString());
      }
    },
    async (action, oldState, newState) => {
      if (
        !("type" in action && action.type === "Update" && action.desc === "undo") &&
        oldState.program !== newState.program
      ) {
        dispatch([
          lb<IBuilderState>()
            .p("history")
            .recordModify((history) => {
              return { ...history, past: [...history.past, oldState.program], future: [] };
            }),
        ]);
      }
    },
    async (action, oldState, newState) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).state = newState;
    },
  ]);

  useCopyPaste(state, dispatch);
  useUndoRedo(state, dispatch);

  const modalExerciseUi = state.ui.modalExercise;
  const modalSubstituteUi = state.ui.modalSubstitute;
  const modalExercisesByMuscle = state.ui.modalExercisesByMuscle;

  return (
    <section className="py-16">
      <h1 className="text-2xl font-bold">
        <a className="font-bold underline text-bluev2 " href="/builder">
          Weightlifting Program Builder
        </a>
      </h1>
      <h2 className="pb-3 mt-16 text-xl font-bold">
        <BuilderLinkInlineInput
          value={state.program.name}
          onInputString={(value) => {
            dispatch([lb<IBuilderState>().p("program").p("name").record(value)]);
          }}
        />
      </h2>
      {state.program.weeks.map((week, index) => (
        <BuilderWeek
          numberOfWeeks={state.program.weeks.length}
          selectedExercise={state.ui.selectedExercise}
          week={week}
          index={index}
          settings={state.settings}
          dispatch={dispatch}
        />
      ))}
      <LinkButton
        onClick={() => {
          const lastWeek = state.program.weeks[state.program.weeks.length - 1];
          const week = BuilderWeekModel.build(StringUtils.nextName(lastWeek.name));
          dispatch([
            lb<IBuilderState>()
              .p("program")
              .p("weeks")
              .recordModify((weeks) => [...weeks, week]),
          ]);
        }}
      >
        Add Week
      </LinkButton>
      {modalExerciseUi && (
        <BuilderModalExercise
          dispatch={dispatch}
          onChange={(exerciseId) => {
            if (exerciseId) {
              const exercise = Exercise.getById(exerciseId, {});
              dispatch([
                lb<IBuilderState>()
                  .p("program")
                  .p("weeks")
                  .i(modalExerciseUi.weekIndex)
                  .p("days")
                  .i(modalExerciseUi.dayIndex)
                  .p("exercises")
                  .i(modalExerciseUi.exerciseIndex)
                  .p("exerciseType")
                  .record({ id: exercise.id, equipment: exercise.equipment }),
              ]);
            }
            dispatch([lb<IBuilderState>().p("ui").p("modalExercise").record(undefined)]);
          }}
        />
      )}
      {modalSubstituteUi && (
        <ModalSubstitute
          exerciseType={modalSubstituteUi.exerciseType}
          customExercises={{}}
          onChange={(exerciseId) => {
            if (exerciseId) {
              const exercise = Exercise.getById(exerciseId, {});
              dispatch([
                lb<IBuilderState>()
                  .p("program")
                  .p("weeks")
                  .i(modalSubstituteUi.weekIndex)
                  .p("days")
                  .i(modalSubstituteUi.dayIndex)
                  .p("exercises")
                  .i(modalSubstituteUi.exerciseIndex)
                  .p("exerciseType")
                  .record({ id: exercise.id, equipment: exercise.equipment }),
              ]);
            }
            dispatch([lb<IBuilderState>().p("ui").p("modalSubstitute").record(undefined)]);
          }}
        />
      )}
      {modalExercisesByMuscle && (
        <ModalExercisesByMuscle
          screenMuscle={modalExercisesByMuscle.muscle}
          customExercises={{}}
          onChange={(exerciseId) => {
            if (exerciseId) {
              const exercise = Exercise.getById(exerciseId, {});
              const exType = ObjectUtils.pick(exercise, ["id", "equipment"]);
              const week = state.program.weeks[modalExercisesByMuscle.weekIndex];
              dispatch([
                lb<IBuilderState>()
                  .p("program")
                  .p("weeks")
                  .i(modalExercisesByMuscle.weekIndex)
                  .p("days")
                  .i(week.days.length - 1)
                  .p("exercises")
                  .recordModify((exercises) => [...exercises, BuilderExerciseModel.build(exType)]),
              ]);
            }
            dispatch([lb<IBuilderState>().p("ui").p("modalExercisesByMuscle").record(undefined)]);
          }}
        />
      )}
    </section>
  );
}
