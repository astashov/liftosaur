import { h, JSX } from "preact";
import { IconMuscles2 } from "../icons/iconMuscles2";
import { IconStar } from "../icons/iconStar";
import { Tailwind } from "../../utils/tailwindConfig";
import { ScrollableTabs } from "../scrollableTabs";
import { ExercisePickerFromProgram } from "./exercisePickerFromProgram";
import { IEvaluatedProgram } from "../../models/program";
import { IExercisePickerState, ISettings } from "../../types";
import { ExercisePickerAdhocExercises } from "./exercisePickerAdhocExercises";
import { Button } from "../button";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";

interface IProps {
  isHidden: boolean;
  settings: ISettings;
  dispatch: ILensDispatch<IExercisePickerState>;
  state: IExercisePickerState;
  evaluatedProgram?: IEvaluatedProgram;
  onClose: () => void;
}

export function ExercisePickerMain(props: IProps): JSX.Element {
  const { evaluatedProgram } = props;
  return (
    <div className="flex flex-col h-full" style={{ marginTop: "-0.75rem" }}>
      <div className="relative py-4 mt-2">
        <h3 className="px-4 font-bold text-center">Exercises</h3>
        <div className="absolute flex top-4 right-4">
          <div>
            <button className="px-2">
              <IconMuscles2 color={Tailwind.colors().purplev3.main} />
            </button>
          </div>
          <div>
            <button className="px-2">
              <IconStar color={Tailwind.colors().purplev3.main} />
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
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
                label: "From Program",
                children: () => (
                  <ExercisePickerFromProgram settings={props.settings} evaluatedProgram={evaluatedProgram} />
                ),
              },
              {
                label: "Ad-hoc Exercise",
                children: () => (
                  <ExercisePickerAdhocExercises
                    state={props.state}
                    settings={props.settings}
                    dispatch={props.dispatch}
                  />
                ),
              },
            ]}
          />
        ) : (
          <ExercisePickerAdhocExercises state={props.state} settings={props.settings} dispatch={props.dispatch} />
        )}
      </div>
      <div className="w-full px-4 pt-2 pb-2" style={{ boxShadow: "0 -4px 4px 0 rgba(0, 0, 0, 0.05)" }}>
        <Button className="w-full" name="pick-exercises" kind="purple" buttonSize="lg">
          Add to this workout
        </Button>
      </div>
    </div>
  );
}
