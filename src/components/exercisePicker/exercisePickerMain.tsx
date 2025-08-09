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
import { Input, IValidationError } from "../input";
import { useRef } from "preact/hooks";
import { IEither } from "../../utils/types";
import { ExercisePickerTemplate } from "./exercisePickerTemplate";

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
  const title =
    props.state.mode === "workout"
      ? props.state.exerciseType
        ? "Swap Exercise"
        : "Add Exercises"
      : props.state.exerciseType || props.state.templateName
        ? "Edit Exercise"
        : "Add Exercise";

  const tabs = [
    {
      label: props.state.mode === "workout" ? "Ad-hoc Exercise" : "Exercise",
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
  ];
  if (props.state.mode === "workout" && evaluatedProgram) {
    tabs.push({
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
    });
  }
  if (props.state.mode === "program") {
    tabs.push({
      label: "Template",
      children: () => <ExercisePickerTemplate dispatch={props.dispatch} templateName={props.state.templateName} />,
    });
  }
  const labelRef = useRef<HTMLInputElement>(null);

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
              <IconMuscles2 color={Tailwind.colors().purplev3.main} isSelected={props.state.showMuscles} />
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
        {props.state.mode === "program" && (
          <div className="px-4 pb-1">
            <Input
              label="Label"
              ref={labelRef}
              defaultValue={props.state.label}
              isLabelOutside={true}
              changeType={"oninput"}
              inputSize="sm"
              pattern="^[^\/\{\}\(\)\t\n\r#\[\]]+$"
              patternMessage="Label cannot contain special characters: '/{}()#[]'"
              labelSize="xs"
              changeHandler={(e: IEither<string, Set<IValidationError>>) => {
                if (e.success) {
                  props.dispatch(
                    [
                      lb<IExercisePickerState>().p("label").record(e.data),
                      lb<IExercisePickerState>()
                        .p("selectedExercises")
                        .recordModify((exercises) => {
                          return exercises.map((ex) => {
                            if (ex.type === "adhoc" || ex.type === "template") {
                              return { ...ex, label: e.data };
                            } else {
                              return ex;
                            }
                          });
                        }),
                    ],
                    `Set label to ${e.data}`
                  );
                }
              }}
            />
          </div>
        )}
        {props.state.exerciseType && (
          <ExercisePickerCurrentExercise
            state={props.state}
            exerciseType={props.state.exerciseType}
            settings={props.settings}
          />
        )}
        {tabs.length > 1 ? (
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
            tabs={tabs}
          />
        ) : (
          tabs[0].children()
        )}
      </div>
      <div className="w-full px-4 pt-2 pb-2" style={{ boxShadow: "0 -4px 4px 0 rgba(0, 0, 0, 0.05)" }}>
        <BottomButton
          state={props.state}
          evaluatedProgram={evaluatedProgram}
          onClick={() => {
            const isTemplateSave = props.state.mode === "program" && props.state.selectedTab === 1;
            if (isTemplateSave && props.state.templateName) {
              props.onChoose([
                {
                  type: "template",
                  name: props.state.templateName,
                  label: props.state.label,
                },
              ]);
            } else {
              props.onChoose(props.state.selectedExercises);
            }
          }}
          settings={props.settings}
        />
      </div>
    </div>
  );
}

interface IBottomButtonProps {
  evaluatedProgram?: IEvaluatedProgram;
  state: IExercisePickerState;
  onClick: () => void;
  settings: ISettings;
}

function BottomButton(props: IBottomButtonProps): JSX.Element {
  const selectedExercises = CollectionUtils.compact(
    props.state.selectedExercises.map((e) => {
      if (e.type === "adhoc") {
        const ex = Exercise.get(e.exerciseType, props.settings.exercises);
        return Exercise.fullName(ex, props.settings);
      } else if (e.type === "program") {
        return props.evaluatedProgram
          ? ExercisePickerUtils.getProgramExercisefullName(e, props.evaluatedProgram, props.settings)
          : undefined;
      } else {
        return undefined;
      }
    })
  );
  return (
    <div>
      <div>
        <Button
          className="w-full"
          name="pick-exercises"
          kind="purple"
          buttonSize="lg"
          onClick={props.onClick}
          data-cy="exercise-picker-confirm"
        >
          {props.state.mode === "workout" ? (
            props.state.exerciseType ? (
              <>Swap Exercise</>
            ) : selectedExercises.length > 0 ? (
              <>Add to this workout{selectedExercises.length > 0 ? ` (${selectedExercises.length})` : ""}</>
            ) : (
              <>Close</>
            )
          ) : props.state.exerciseType || props.state.templateName ? (
            <>Save {props.state.selectedTab === 1 ? "Template" : "Exercise"}</>
          ) : selectedExercises.length > 0 ? (
            <>Add {props.state.selectedTab === 1 ? "Template" : "Exercise"}</>
          ) : (
            <>Close</>
          )}
        </Button>
      </div>
      {!(props.state.mode === "program" && props.state.selectedTab === 1) && (
        <div className="text-xs text-grayv3-main">
          {selectedExercises.map((e, i) => (
            <>
              {i > 0 ? "; " : ""}
              <strong>{e}</strong>
            </>
          ))}
        </div>
      )}
    </div>
  );
}
