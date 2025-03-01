import { h, JSX } from "preact";
import { Modal } from "./modal";
import { IDispatch } from "../ducks/types";
import { IProgram, IScreenMuscle, ISettings } from "../types";
import { MenuItemEditable } from "./menuItemEditable";
import { IEvaluatedProgram, Program } from "../models/program";
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

interface IModalChangeNextDayProps {
  dispatch: IDispatch;
  currentProgram: IEvaluatedProgram;
  allPrograms: IProgram[];
  settings: ISettings;
  onClose: () => void;
}

export function ModalChangeNextDay(props: IModalChangeNextDayProps): JSX.Element {
  const programsValues = props.allPrograms.map<[string, string]>((p) => [p.id, p.name]);
  const days = Program.getListOfDays(props.currentProgram);
  return (
    <Modal shouldShowClose={true} onClose={props.onClose} isFullWidth>
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
      <div className="pt-8 text-xs">
        <span className="text-grayv2-main">Next Workout: </span>
        <strong>{Program.getDayName(props.currentProgram, props.currentProgram.nextDay)}</strong>
      </div>
      <GroupHeader name="Change next workout:" />
      {days.map(([dayId, dayName], dayIndex) => {
        const day = Program.getProgramDay(props.currentProgram, dayIndex + 1);
        if (!day) {
          return null;
        }
        const exerciseTypes = CollectionUtils.compact(
          Program.getProgramDayExercises(day).map((exercise) => {
            return Exercise.find(exercise.exerciseType, props.settings.exercises);
          })
        );
        const points = Muscle.normalizeUnifiedPoints(
          Muscle.getUnifiedPointsForDay(props.currentProgram, day, props.settings)
        );
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
              EditProgram.setNextDay(props.dispatch, props.currentProgram.id, dayIndex + 1);
              props.onClose();
            }}
          >
            <div className="flex py-2">
              <div className="flex-1">
                <div>{dayName}</div>
                <div>
                  {exerciseTypes.map((e) => (
                    <ExerciseImage settings={props.settings} exerciseType={e} size="small" className="w-6 mr-1" />
                  ))}
                </div>
              </div>
              <div className="flex items-center w-12">
                <div className="relative flex-1">
                  <BackMusclesSvg muscles={muscleData} contour={{ fill: "#28839F" }} />
                </div>
                <div className="relative flex-1">
                  <FrontMusclesSvg muscles={muscleData} contour={{ fill: "#28839F" }} />
                </div>
              </div>
              <div className="flex items-center py-2 pl-2">
                <IconArrowRight style={{ color: "#a0aec0" }} />
              </div>
            </div>
          </MenuItemWrapper>
        );
      })}
    </Modal>
  );
}
