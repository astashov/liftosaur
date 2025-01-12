import { lb } from "lens-shmens";
import React, { JSX } from "react";
import { View, TouchableOpacity, GestureResponderEvent } from "react-native";
import { Exercise, equipmentName } from "../../models/exercise";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";
import { focusedToStr, IPlannerProgramExercise, IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { PlannerKey } from "../../pages/planner/plannerKey";
import { IDayData, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { ExerciseImage } from "../exerciseImage";
import { GroupHeader } from "../groupHeader";
import { HistoryRecordSet } from "../historyRecordSets";
import { IconArrowDown2 } from "../icons/iconArrowDown2";
import { IconArrowRight } from "../icons/iconArrowRight";
import { IconDuplicate2 } from "../icons/iconDuplicate2";
import { IconEditSquare } from "../icons/iconEditSquare";
import { IconHandle } from "../icons/iconHandle";
import { IconTrash } from "../icons/iconTrash";
import { SetNumber } from "./editProgramSets";
import { EditProgramUiDescriptions } from "./editProgramUi/editProgramUiDescriptions";
import { EditProgramUiHelpers } from "./editProgramUi/editProgramUiHelpers";
import { EditProgramUiProgress } from "./editProgramUi/editProgramUiProgress";
import { EditProgramUiUpdate } from "./editProgramUi/editProgramUiUpdate";
import { LftText } from "../lftText";

interface IEditProgramV2UiExerciseProps {
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
  dayData: Required<IDayData>;
  exerciseLine: number;
  ui: IPlannerUi;
  handleTouchStart?: (e: GestureResponderEvent) => void;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramV2UiExercise(props: IEditProgramV2UiExerciseProps): JSX.Element {
  const { plannerExercise, exerciseLine } = props;
  const { week, dayInWeek } = props.dayData;
  const key = PlannerKey.fromPlannerExercise(plannerExercise, props.settings);
  const weekIndex = week - 1;
  const dayIndex = dayInWeek - 1;
  const exercise = Exercise.findByName(plannerExercise.name, props.settings.exercises);
  const exerciseType = exercise != null ? { id: exercise.id, equipment: plannerExercise.equipment } : undefined;
  const warmupSets =
    PlannerProgramExercise.warmups(plannerExercise) ||
    (exercise != null ? PlannerProgramExercise.defaultWarmups(exercise, props.settings) : []);
  const displayWarmupSets = PlannerProgramExercise.warmupSetsToDisplaySets(warmupSets);
  const isCollapsed = props.ui.exerciseUi.collapsed.has(focusedToStr({ weekIndex, dayIndex, exerciseLine }));
  const reusingSets = plannerExercise.reuse?.fullName;
  const repeatStr = PlannerProgramExercise.repeatToRangeStr(plannerExercise);
  const order = plannerExercise.order !== 0 ? plannerExercise.order : undefined;
  const orderAndRepeat = [order, repeatStr].filter((s) => s).join(", ");
  const progress = plannerExercise.properties.find((p) => p.name === "progress");
  const update = plannerExercise.properties.find((p) => p.name === "update");
  const lbProgram = lb<IPlannerState>().p("current").p("program");

  return (
    <View
      data-cy={`exercise-${key}`}
      className="px-2 py-1 mb-2 border rounded-lg bg-purplev2-100"
      style={{ minHeight: 80 }}
    >
      <View className="flex flex-row items-center">
        <View className="flex flex-row items-center flex-1">
          {props.handleTouchStart && (
            <View className="p-2 mr-1 cursor-move">
              <TouchableOpacity
                onPressIn={(e) => {
                  if (props.handleTouchStart) {
                    props.handleTouchStart(e);
                  }
                }}
              >
                <IconHandle />
              </TouchableOpacity>
            </View>
          )}
          <View>
            <SetNumber setIndex={props.exerciseLine} />
          </View>
          {orderAndRepeat && <LftText className="ml-4 text-xs font-bold text-grayv2-main">[{orderAndRepeat}]</LftText>}
          {plannerExercise.notused && (
            <LftText className="px-1 ml-3 text-xs font-bold text-white rounded bg-grayv2-main">UNUSED</LftText>
          )}
        </View>
        <View>
          <TouchableOpacity
            data-cy="edit-exercise"
            className="px-2 align-middle ls-edit-day-v2 button nm-edit-day-v2"
            onPress={() => {
              props.plannerDispatch(
                lb<IPlannerState>()
                  .p("ui")
                  .p("exerciseUi")
                  .p("edit")
                  .recordModify((edit) => {
                    const newEdit = new Set(Array.from(edit));
                    const exKey = focusedToStr({ weekIndex, dayIndex, exerciseLine });
                    newEdit.add(exKey);
                    return newEdit;
                  })
              );
            }}
          >
            <IconEditSquare />
          </TouchableOpacity>
          <TouchableOpacity
            data-cy="clone-exercise"
            className="px-2 align-middle ls-clone-day-v2 button nm-clone-day-v2"
            onPress={() => {
              props.plannerDispatch(
                lb<IPlannerState>()
                  .p("ui")
                  .p("modalExercise")
                  .record({
                    focusedExercise: {
                      weekIndex,
                      dayIndex,
                      exerciseLine,
                    },
                    types: [],
                    muscleGroups: [],
                    exerciseKey: PlannerKey.fromFullName(plannerExercise.fullName, props.settings),
                    fullName: plannerExercise.fullName,
                    exerciseType,
                    change: "duplicate",
                  })
              );
            }}
          >
            <IconDuplicate2 />
          </TouchableOpacity>
          <TouchableOpacity
            data-cy={`delete-exercise`}
            className="px-2 align-middle ls-delete-day-v2 button nm-delete-day-v2"
            onPress={() => {
              props.plannerDispatch(
                lbProgram.recordModify((program) => {
                  return EditProgramUiHelpers.deleteCurrentInstance(
                    program,
                    props.dayData,
                    plannerExercise.fullName,
                    props.settings
                  );
                })
              );
            }}
          >
            <IconTrash />
          </TouchableOpacity>
        </View>
      </View>
      <View className="flex flex-row items-center flex-1">
        {exerciseType && (
          <View className="mr-3">
            <ExerciseImage settings={props.settings} className="w-8" exerciseType={exerciseType} size="small" />
          </View>
        )}
        <View className="flex flex-row items-center flex-1 mr-2 text-lg">
          <LftText data-cy="planner-ui-exercise-name">
            {plannerExercise.label ? `${plannerExercise.label}: ` : ""}
            {plannerExercise.name}
            {plannerExercise.equipment != null && plannerExercise.equipment !== exercise?.defaultEquipment && (
              <LftText className="text-xs text-grayv2-main">{equipmentName(plannerExercise.equipment)}</LftText>
            )}
          </LftText>
          <View>
            <TouchableOpacity
              className="w-8 p-2 mr-1 text-center nm-edit-program-v2-expand-collapse-exercise"
              data-cy="collapse-exercise"
              onPress={() => {
                props.plannerDispatch(
                  lb<IPlannerState>()
                    .p("ui")
                    .p("exerciseUi")
                    .p("collapsed")
                    .recordModify((collapsed) => {
                      const newCollapsed = new Set(Array.from(collapsed));
                      const exKey = focusedToStr({ weekIndex, dayIndex, exerciseLine });
                      if (newCollapsed.has(exKey)) {
                        newCollapsed.delete(exKey);
                      } else {
                        newCollapsed.add(exKey);
                      }
                      return newCollapsed;
                    })
                );
              }}
            >
              {isCollapsed ? <IconArrowRight className="inline-block" /> : <IconArrowDown2 className="inline-block" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {!isCollapsed && (
        <>
          {plannerExercise.descriptions.length > 0 && (
            <EditProgramUiDescriptions header="Descriptions" showCurrent={true} plannerExercise={plannerExercise} />
          )}
          <View className="px-1">
            {PlannerProgramExercise.setVariations(plannerExercise).map((_, i) => {
              const sets = PlannerProgramExercise.sets(plannerExercise, i);
              const hasCurrentSets = !!plannerExercise.setVariations[i]?.sets;
              const globals = plannerExercise.globals;
              const displayGroups = PlannerProgramExercise.setsToDisplaySets(
                sets,
                hasCurrentSets,
                globals,
                props.settings
              );
              let currentIndex = plannerExercise.setVariations.findIndex((v) => v.isCurrent);
              currentIndex = currentIndex === -1 ? 0 : currentIndex;
              return (
                <View key={i}>
                  <View>
                    {plannerExercise.setVariations.length > 1 && (
                      <GroupHeader
                        highlighted={true}
                        name={`Set Variation ${i + 1}`}
                        rightAddOn={
                          plannerExercise.setVariations.length > 1 && currentIndex === i ? (
                            <LftText className="px-1 text-xs font-bold text-white rounded bg-grayv2-main">
                              CURRENT
                            </LftText>
                          ) : undefined
                        }
                      />
                    )}
                  </View>
                  <View className="flex flex-row items-end">
                    {displayWarmupSets.flat().length > 0 && (
                      <>
                        <View>
                          <LftText className="text-xs text-center text-grayv2-main">Warmups</LftText>
                          <View className="flex flex-row">
                            {displayWarmupSets.map((g, index) => (
                              <HistoryRecordSet key={index} sets={g} isNext={true} />
                            ))}
                          </View>
                        </View>
                        <View className="ml-2 mr-4 bg-grayv2-100" style={{ width: 1, height: 60 }} />
                      </>
                    )}
                    <View>
                      {reusingSets && <LftText className="text-xs text-grayv2-main">Reusing {reusingSets}</LftText>}
                      <View className="flex flex-wrap">
                        {displayGroups.map((g, index) => (
                          <HistoryRecordSet key={index} sets={g} isNext={true} />
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
          <View className="px-1 pb-2 text-xs text-grayv2-main">
            {progress && <EditProgramUiProgress progress={progress} />}
            {update && <EditProgramUiUpdate update={update} />}
          </View>
        </>
      )}
    </View>
  );
}
