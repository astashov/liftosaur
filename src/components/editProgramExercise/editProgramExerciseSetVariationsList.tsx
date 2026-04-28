import { JSX, useRef } from "react";
import { View, Pressable, useWindowDimensions } from "react-native";
import { ScrollView, Gesture, GestureDetector } from "react-native-gesture-handler";
import { Text } from "../primitives/text";
import { WorkoutScrollGestureContext } from "../workoutScrollGestureContext";
import { IPlannerExerciseState, IPlannerExerciseUi, IPlannerProgramExercise } from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconArrowDown3 } from "../icons/iconArrowDown3";
import { Tailwind_colors } from "../../utils/tailwindConfig";
import { EditProgramExerciseSetVariation } from "./editProgramExerciseSetVariation";
import { IconPlus2 } from "../icons/iconPlus2";
import { EditProgramUiHelpers_changeCurrentInstanceExercise } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { ObjectUtils_clone } from "../../utils/object";

interface IEditProgramExerciseSetVariationsListProps {
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  ui: IPlannerExerciseUi;
  settings: ISettings;
  exerciseStateKey: string;
  programId: string;
}

export function EditProgramExerciseSetVariationsList(props: IEditProgramExerciseSetVariationsListProps): JSX.Element {
  const setVariations = props.plannerExercise.evaluatedSetVariations;
  const scrollRef = useRef<ScrollView>(null);
  const scrollXRef = useRef(0);
  const scrollGesture = useRef(Gesture.Native()).current;
  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = Math.max(1, windowWidth - 4);

  return (
    <View>
      {setVariations.length > 1 && (
        <View className="flex-row items-center gap-4 pt-3 mx-4 mt-1 mb-2 border-t border-border-neutral">
          <View className="flex-1">
            <Text>{setVariations.length} Set Variations</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Pressable
              data-cy="set-variations-add" data-testid="set-variations-add"
              testID="set-variations-add"
              className="p-1 mr-4 border rounded-full border-border-neutral"
              onPress={() => {
                return EditProgramUiHelpers_changeCurrentInstanceExercise(
                  props.plannerDispatch,
                  props.plannerExercise,
                  props.settings,
                  (ex) => {
                    const lastSetVariation = ObjectUtils_clone(
                      ex.evaluatedSetVariations[ex.evaluatedSetVariations.length - 1]
                    );
                    ex.evaluatedSetVariations.push(lastSetVariation);
                  }
                );
              }}
            >
              <IconPlus2 color={Tailwind_colors().lightgray[600]} size={14} />
            </Pressable>
            <Pressable
              className="p-1 border rounded-full border-border-neutral"
              data-cy="set-variations-scroll-left" data-testid="set-variations-scroll-left"
              testID="set-variations-scroll-left"
              onPress={() => {
                if (!scrollRef.current) {
                  return;
                }
                scrollRef.current.scrollTo({ x: Math.max(0, scrollXRef.current - pageWidth), animated: true });
              }}
            >
              <View style={{ transform: [{ rotate: "90deg" }] }}>
                <IconArrowDown3 color={Tailwind_colors().lightgray[600]} size={14} />
              </View>
            </Pressable>
            <Pressable
              data-cy="set-variations-scroll-right" data-testid="set-variations-scroll-right"
              testID="set-variations-scroll-right"
              className="p-1 border rounded-full border-border-neutral"
              onPress={() => {
                if (!scrollRef.current) {
                  return;
                }
                scrollRef.current.scrollTo({ x: scrollXRef.current + pageWidth, animated: true });
              }}
            >
              <View style={{ transform: [{ rotate: "-90deg" }] }}>
                <IconArrowDown3 color={Tailwind_colors().lightgray[600]} size={14} />
              </View>
            </Pressable>
          </View>
        </View>
      )}
      <WorkoutScrollGestureContext.Provider value={scrollGesture}>
        <GestureDetector gesture={scrollGesture}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              scrollXRef.current = e.nativeEvent.contentOffset.x;
            }}
            scrollEventThrottle={16}
          >
            {setVariations.map((setVariation, index) => {
              return (
                <View
                  key={index}
                  data-cy={`set-variation-${index + 1}`} data-testid={`set-variation-${index + 1}`}
                  testID={`set-variation-${index + 1}`}
                  style={{ width: pageWidth }}
                >
                  <EditProgramExerciseSetVariation
                    areSetVariationsEnabled={setVariations.length > 1}
                    name={setVariations.length > 1 ? `Set Variation ${index + 1}` : "Working Sets"}
                    setVariation={setVariation}
                    setVariationIndex={index}
                    ui={props.ui}
                    plannerExercise={props.plannerExercise}
                    plannerDispatch={props.plannerDispatch}
                    settings={props.settings}
                    exerciseStateKey={props.exerciseStateKey}
                    programId={props.programId}
                  />
                </View>
              );
            })}
          </ScrollView>
        </GestureDetector>
      </WorkoutScrollGestureContext.Provider>
    </View>
  );
}
