import { View } from "react-native";
import { LftModal } from "./modal";
import { IDispatch } from "../ducks/types";
import { IProgram, IScreenMuscle, ISettings } from "../types";
import { MenuItemEditable } from "./menuItemEditable";
import { Program } from "../models/program";
import { MenuItemWrapper } from "./menuItem";
import { GroupHeader } from "./groupHeader";
import { EditProgram } from "../models/editProgram";
import { CollectionUtils } from "../utils/collection";
import { Exercise } from "../models/exercise";
import { ExerciseImage } from "./exerciseImage";
import { Muscle } from "../models/muscle";
import { ObjectUtils } from "../utils/object";
import { BackMusclesSvg, IMuscleStyle } from "./muscles/images/backMusclesSvg";
import { FrontMusclesSvg } from "./muscles/images/frontMusclesSvg";
import { IconArrowRight } from "./icons/iconArrowRight";
import { LftText } from "./lftText";

interface IModalChangeNextDayProps {
  dispatch: IDispatch;
  currentProgram: IProgram;
  allPrograms: IProgram[];
  settings: ISettings;
  onClose: () => void;
}

export function ModalChangeNextDay(props: IModalChangeNextDayProps): JSX.Element {
  const fullProgram = Program.fullProgram(props.currentProgram, props.settings);
  const programsValues = props.allPrograms.map<[string, string]>((p) => [p.id, p.name]);
  const days = Program.getListOfDays(fullProgram, props.settings);
  return (
    <LftModal shouldShowClose={true} onClose={props.onClose} isFullWidth>
      <MenuItemEditable
        type="select"
        name="Program"
        value={props.currentProgram.id}
        values={programsValues}
        onChange={(value) => {
          if (value) {
            Program.selectProgram(props.dispatch, value);
          }
        }}
      />
      <View className="pt-8">
        <LftText>
          <LftText className="text-xs text-grayv2-main">Next Workout: </LftText>
          <LftText className="text-xs font-bold">
            {Program.getDayName(fullProgram, fullProgram.nextDay, props.settings)}
          </LftText>
        </LftText>
      </View>
      <GroupHeader name="Change next workout:" />
      {days.map(([dayId, dayName], dayIndex) => {
        const day = Program.getProgramDay(fullProgram, dayIndex + 1);
        const exerciseTypes = CollectionUtils.compact(
          day.exercises.map((exercise) => {
            const programExercise = Program.getProgramExerciseById(fullProgram, exercise.id);
            return programExercise ? Exercise.find(programExercise.exerciseType, props.settings.exercises) : undefined;
          })
        );
        const points = Muscle.normalizeUnifiedPoints(Muscle.getUnifiedPointsForDay(fullProgram, day, props.settings));
        const muscleData = ObjectUtils.keys(points.screenMusclePoints).reduce<
          Partial<Record<IScreenMuscle, IMuscleStyle>>
        >((memo, key) => {
          const value = points.screenMusclePoints[key];
          memo[key] = { opacity: value, fill: "#28839F" };
          return memo;
        }, {});
        return (
          <MenuItemWrapper
            name="modal-change-day-day"
            key={dayId}
            onClick={() => {
              EditProgram.setNextDay(props.dispatch, fullProgram, dayIndex + 1);
              props.onClose();
            }}
          >
            <View className="flex flex-row py-2">
              <View className="flex-1">
                <LftText>{dayName}</LftText>
                <View className="flex flex-row">
                  {exerciseTypes.map((e) => (
                    <ExerciseImage settings={props.settings} exerciseType={e} size="small" className="w-8 h-10 mr-1" />
                  ))}
                </View>
              </View>
              <View className="flex flex-row items-center w-20">
                <View className="relative flex-1 w-10 h-12">
                  <BackMusclesSvg muscles={muscleData} contour={{ fill: "#28839F" }} />
                </View>
                <View className="relative flex-1 w-10 h-12">
                  <FrontMusclesSvg muscles={muscleData} contour={{ fill: "#28839F" }} />
                </View>
              </View>
              <View className="flex flex-row items-center py-2 pl-2">
                <IconArrowRight style={{ color: "#a0aec0" }} />
              </View>
            </View>
          </MenuItemWrapper>
        );
      })}
    </LftModal>
  );
}
