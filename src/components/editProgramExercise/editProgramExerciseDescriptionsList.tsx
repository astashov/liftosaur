import { JSX, useRef } from "react";
import { View, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { Text } from "../primitives/text";
import { IPlannerExerciseState, IPlannerProgramExercise } from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconArrowDown3 } from "../icons/iconArrowDown3";
import { Tailwind_colors } from "../../utils/tailwindConfig";
import { IconPlus2 } from "../icons/iconPlus2";
import { EditProgramUiHelpers_changeCurrentInstanceExercise } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { EditProgramExerciseDescription } from "./editProgramExerciseDescription";

interface IEditProgramExerciseDescriptionsListProps {
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

export function EditProgramExerciseDescriptionsList(props: IEditProgramExerciseDescriptionsListProps): JSX.Element {
  const descriptions = props.plannerExercise.descriptions;
  const scrollRef = useRef<ScrollView>(null);
  const scrollXRef = useRef(0);
  const { width: windowWidth } = useWindowDimensions();
  const isMultiple = descriptions.values.length > 1;
  const pageWidth = Math.max(1, windowWidth - 4);

  return (
    <View>
      <View className="flex-row items-center gap-4 pt-3 mx-4 mt-1 mb-2 border-t border-border-neutral">
        <View className="flex-1">
          <Text>{descriptions.values.length === 1 ? "Description" : `${descriptions.values.length} Descriptions`}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Pressable
            className="p-1 border rounded-full border-border-neutral"
            onPress={() => {
              return EditProgramUiHelpers_changeCurrentInstanceExercise(
                props.plannerDispatch,
                props.plannerExercise,
                props.settings,
                (ex) => {
                  ex.descriptions.values.push({ isCurrent: false, value: "" });
                }
              );
            }}
          >
            <IconPlus2 color={Tailwind_colors().lightgray[600]} size={14} />
          </Pressable>
          {isMultiple && (
            <>
              <Pressable
                className="p-1 ml-4 border rounded-full border-border-neutral"
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
            </>
          )}
        </View>
      </View>
      <ScrollView
        ref={scrollRef}
        className="mb-6"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          scrollXRef.current = e.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
      >
        {descriptions.values.map((description, index) => {
          return (
            <View key={index} style={{ width: pageWidth }}>
              <EditProgramExerciseDescription
                isMultiple={isMultiple}
                description={description}
                descriptionIndex={index}
                plannerExercise={props.plannerExercise}
                plannerDispatch={props.plannerDispatch}
                settings={props.settings}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
