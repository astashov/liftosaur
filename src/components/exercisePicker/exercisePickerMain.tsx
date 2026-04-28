import { JSX, Fragment } from "react";
import { View, Pressable, Platform } from "react-native";
import { Text } from "../primitives/text";
import { IconMuscles2 } from "../icons/iconMuscles2";
import { IconStar } from "../icons/iconStar";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { ScrollableTabs } from "../scrollableTabs";
import { ExercisePickerFromProgram } from "./exercisePickerFromProgram";
import { IEvaluatedProgram } from "../../models/program";
import { IExercisePickerSelectedExercise, IExercisePickerState, IExerciseType, ISettings } from "../../types";
import { ExercisePickerAdhocExercises } from "./exercisePickerAdhocExercises";
import { Button } from "../button";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { Exercise_get, Exercise_fullName } from "../../models/exercise";
import { ExercisePickerUtils_getProgramExercisefullName } from "./exercisePickerUtils";
import { CollectionUtils_compact } from "../../utils/collection";
import { ExercisePickerCurrentExercise } from "./exercisePickerCurrentExercise";
import { Input, IValidationError } from "../input";
import { IEither } from "../../utils/types";
import { ExercisePickerTemplate } from "./exercisePickerTemplate";
import { IconFilter } from "../icons/iconFilter";
import { SheetDragHandle } from "../../navigation/SheetScreenContainer";
import { getNavigationRef } from "../../navigation/navUtils";

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

  return (
    <View className="flex-1">
      <SheetDragHandle>
        <View className="relative py-1">
          <Text className="px-4 py-2 font-bold text-center">{title}</Text>
          <View className="absolute flex-row top-3 left-4">
            <Pressable
              className="px-2"
              onPress={async () => {
                if (Platform.OS === "web") {
                  props.dispatch(
                    lb<IExercisePickerState>()
                      .p("screenStack")
                      .recordModify((stack) => [...stack, "settings"]),
                    "Navigate to settings picker screen"
                  );
                } else {
                  const { navigationRef } = await getNavigationRef();
                  navigationRef.navigate("exercisePickerSettingsModal");
                }
              }}
            >
              <IconFilter />
            </Pressable>
          </View>
          <View className="absolute flex-row items-center top-3 right-4">
            <Pressable
              className="px-2"
              onPress={() => {
                console.log("Show muacles");
                props.dispatch(
                  lb<IExercisePickerState>().p("showMuscles").record(!props.state.showMuscles),
                  `Toggle show muscles to ${!props.state.showMuscles}`
                );
              }}
            >
              <IconMuscles2 color={Tailwind_semantic().icon.purple} isSelected={props.state.showMuscles} />
            </Pressable>
            <Pressable
              className="px-2"
              onPress={() => {
                console.log("Show starred");
                props.dispatch(
                  lb<IExercisePickerState>().p("filters").p("isStarred").record(!props.state.filters.isStarred),
                  `Toggle starred exercises to ${!props.state.filters.isStarred}`
                );
              }}
            >
              <IconStar isSelected={isStarred} color={Tailwind_semantic().icon.purple} />
            </Pressable>
          </View>
          {props.state.mode === "program" && (
            <View className="px-4 pb-1">
              <Input
                label="Label"
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
            </View>
          )}
          {props.state.exerciseType && (
            <View className="pt-2">
              <ExercisePickerCurrentExercise
                state={props.state}
                exerciseType={props.state.exerciseType}
                settings={props.settings}
              />
            </View>
          )}
        </View>
      </SheetDragHandle>
      <View className="flex-1">
        {tabs.length > 1 ? (
          <ScrollableTabs
            topPadding="0rem"
            shouldNotExpand={true}
            fillHeight={true}
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
          <View className="flex-1">{tabs[0].children()}</View>
        )}
      </View>
      <View
        className="w-full px-4 pt-2 pb-2"
        style={Platform.select({
          ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 4 },
          android: { elevation: 4 },
          default: { boxShadow: "0 -4px 4px 0 rgba(0, 0, 0, 0.05)" },
        })}
      >
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
      </View>
    </View>
  );
}

interface IBottomButtonProps {
  evaluatedProgram?: IEvaluatedProgram;
  state: IExercisePickerState;
  onClick: () => void;
  settings: ISettings;
}

function BottomButton(props: IBottomButtonProps): JSX.Element {
  const selectedExercises = CollectionUtils_compact(
    props.state.selectedExercises.map((e) => {
      if (e.type === "adhoc") {
        const ex = Exercise_get(e.exerciseType, props.settings.exercises);
        return Exercise_fullName(ex, props.settings);
      } else if (e.type === "program") {
        return props.evaluatedProgram
          ? ExercisePickerUtils_getProgramExercisefullName(e, props.evaluatedProgram, props.settings)
          : undefined;
      } else {
        return undefined;
      }
    })
  );
  return (
    <View>
      <Button
        className="w-full"
        name="pick-exercises"
        kind="purple"
        buttonSize="lg"
        onPress={props.onClick}
        data-testid="exercise-picker-confirm"
        testID="exercise-picker-confirm"
      >
        {props.state.mode === "workout"
          ? props.state.exerciseType
            ? "Swap Exercise"
            : selectedExercises.length > 0
              ? `Add to this workout${selectedExercises.length > 0 ? ` (${selectedExercises.length})` : ""}`
              : "Close"
          : props.state.exerciseType || props.state.templateName
            ? `Save ${props.state.selectedTab === 1 ? "Template" : "Exercise"}`
            : selectedExercises.length > 0
              ? `Add ${props.state.selectedTab === 1 ? "Template" : "Exercise"}`
              : "Close"}
      </Button>
      {!(props.state.mode === "program" && props.state.selectedTab === 1) && selectedExercises.length > 0 && (
        <Text className="text-xs text-text-secondary">
          {selectedExercises.map((e, i) => (
            <Fragment key={i}>
              {i > 0 ? "; " : ""}
              <Text className="text-xs font-bold text-text-secondary">{e}</Text>
            </Fragment>
          ))}
        </Text>
      )}
    </View>
  );
}
