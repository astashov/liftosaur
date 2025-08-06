import { h, JSX, Fragment } from "preact";
import { IconMuscles2 } from "../icons/iconMuscles2";
import { IconStar } from "../icons/iconStar";
import { Tailwind } from "../../utils/tailwindConfig";
import { ScrollableTabs } from "../scrollableTabs";
import { ExercisePickerFromProgram } from "./exercisePickerFromProgram";
import { IEvaluatedProgram } from "../../models/program";
import { IExercisePickerSelectedExercise, IExercisePickerState, IExerciseType, ISettings } from "../../types";
import { ExercisePickerAdhocExercises } from "./exercisePickerAdhocExercises";
import { Button } from "../button";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { Exercise } from "../../models/exercise";
import { ExercisePickerUtils } from "./exercisePickerUtils";
import { CollectionUtils } from "../../utils/collection";
import { ExercisePickerCurrentExercise } from "./exercisePickerCurrentExercise";

interface IProps {
  isHidden: boolean;
  settings: ISettings;
  dispatch: ILensDispatch<IExercisePickerState>;
  onStar: (key: string) => void;
  onChoose: (selectedExercises: IExercisePickerSelectedExercise[]) => void;
  usedExerciseTypes: IExerciseType[];
  state: IExercisePickerState;
  evaluatedProgram?: IEvaluatedProgram;
  onClose: () => void;
}

export function ExercisePickerMain(props: IProps): JSX.Element {
  const { evaluatedProgram } = props;
  const isStarred = !!props.state.filters.isStarred;
  const selectedExercises = CollectionUtils.compact(
    props.state.selectedExercises.map((e) => {
      if (e.type === "adhoc") {
        const ex = Exercise.get(e.exerciseType, props.settings.exercises);
        return Exercise.fullName(ex, props.settings);
      } else {
        return evaluatedProgram
          ? ExercisePickerUtils.getProgramExercisefullName(e, evaluatedProgram, props.settings)
          : undefined;
      }
    })
  );
  const title =
    props.state.mode === "workout"
      ? props.state.exerciseType
        ? "Swap Exercise"
        : "Add Exercises"
      : props.state.exerciseType
        ? "Replace Exercise"
        : "Add Exercise";

  return (
    <div className="flex flex-col h-full" style={{ marginTop: "-0.75rem" }}>
      <div className="relative py-4 mt-2">
        <h3 className="px-4 font-bold text-center">{title}</h3>
        <div className="absolute flex top-4 right-4">
          <div>
            <button
              className="px-2"
              onClick={() => {
                props.dispatch(
                  lb<IExercisePickerState>().p("showMuscles").record(!props.state.showMuscles),
                  `Toggle show muscles to ${!props.state.showMuscles}`
                );
              }}
            >
              <IconMuscles2 color={Tailwind.colors().purplev3.main} />
            </button>
          </div>
          <div>
            <button
              className="px-2"
              onClick={() => {
                props.dispatch(
                  lb<IExercisePickerState>().p("filters").p("isStarred").record(!props.state.filters.isStarred),
                  `Toggle starred exercises to ${!props.state.filters.isStarred}`
                );
              }}
            >
              <IconStar isSelected={isStarred} color={Tailwind.colors().purplev3.main} />
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {props.state.exerciseType && (
          <ExercisePickerCurrentExercise
            state={props.state}
            exerciseType={props.state.exerciseType}
            settings={props.settings}
          />
        )}
        {evaluatedProgram ? (
          <ScrollableTabs
            topPadding="0rem"
            shouldNotExpand={true}
            defaultIndex={props.state.selectedTab ?? 0}
            nonSticky={true}
            onChange={(tab) => {
              props.dispatch(
                lb<IExercisePickerState>().p("selectedTab").record(tab),
                `Set selected tab in exercise picker to ${tab}`
              );
            }}
            color="purple"
            tabs={[
              {
                label: "Ad-hoc Exercise",
                children: () => (
                  <ExercisePickerAdhocExercises
                    onStar={props.onStar}
                    usedExerciseTypes={props.usedExerciseTypes}
                    state={props.state}
                    settings={props.settings}
                    dispatch={props.dispatch}
                  />
                ),
              },
              {
                label: "From Program",
                children: () => (
                  <ExercisePickerFromProgram
                    usedExerciseTypes={props.usedExerciseTypes}
                    state={props.state}
                    dispatch={props.dispatch}
                    settings={props.settings}
                    evaluatedProgram={evaluatedProgram}
                  />
                ),
              },
            ]}
          />
        ) : (
          <ExercisePickerAdhocExercises
            onStar={props.onStar}
            state={props.state}
            usedExerciseTypes={props.usedExerciseTypes}
            settings={props.settings}
            dispatch={props.dispatch}
          />
        )}
      </div>
      <div className="w-full px-4 pt-2 pb-2" style={{ boxShadow: "0 -4px 4px 0 rgba(0, 0, 0, 0.05)" }}>
        <div>
          <Button
            className="w-full"
            name="pick-exercises"
            kind="purple"
            buttonSize="lg"
            onClick={() => {
              props.onChoose(props.state.selectedExercises);
            }}
          >
            {props.state.mode === "workout" ? (
              props.state.exerciseType ? (
                <>Swap Exercise</>
              ) : (
                <>Add to this workout{selectedExercises.length > 0 ? ` (${selectedExercises.length})` : ""}</>
              )
            ) : props.state.exerciseType ? (
              <>Edit Exercise</>
            ) : (
              <>Add Exercise</>
            )}
          </Button>
        </div>
        <div className="text-xs text-grayv3-main">
          {selectedExercises.map((e, i) => (
            <>
              {i > 0 ? ", " : ""}
              <strong>{e}</strong>
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
