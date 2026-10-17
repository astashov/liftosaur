import { ILensRecordingPayload, Lens, lb } from "lens-shmens";
import { IState, updateState } from "./state";
import { IDispatch } from "../ducks/types";
import { IAllEquipment, IExerciseType, IEquipment, IEquipmentSetup, ISettings } from "../types";
import { Equipment_getEquipmentIdForExerciseType, Equipment_setupOf } from "./equipment";
import { Exercise_get, Exercise_toKey } from "./exercise";
import { UidFactory_generateUid } from "../utils/generator";
import { EquipmentSetup_validate } from "./equipmentSetup";
import {
  EquipmentSetupEdit_apply,
  EquipmentSetupEdit_default,
  EquipmentSetupEdit_newEquipment,
} from "./equipmentSetupEdit";

export function EditEquipment_setEquipmentForExercise(
  exerciseType: IExerciseType,
  equipment: IEquipment | undefined,
  programExerciseIds: string[],
  dispatch: IDispatch,
  settings: ISettings,
  gymId?: string
): void {
  const exerciseKey = Exercise_toKey(exerciseType);
  gymId = gymId ?? settings.currentGymId ?? settings.gyms[0].id;
  const oldEquipment = Equipment_getEquipmentIdForExerciseType(settings, exerciseType, gymId);

  updateState(
    dispatch,
    [
      lb<IState>()
        .p("storage")
        .p("settings")
        .p("exerciseData")
        .recordModify((data) => {
          return {
            ...data,
            [exerciseKey]: {
              ...data[exerciseKey],
              equipment: { ...data[exerciseKey]?.equipment, [gymId]: equipment ? equipment : undefined },
            },
          };
        }),
    ],
    "Update equipment"
  );
  if (oldEquipment !== equipment) {
    dispatch({
      type: "ApplyProgramChangesToProgress",
      programExerciseIds: programExerciseIds,
    });
  }
}

function gymEquipmentLens(gymId: string): Lens<IState, IAllEquipment> {
  return lb<IState>().p("storage").p("settings").p("gyms").findBy("id", gymId).p("equipment").get();
}

function newEquipmentId(): string {
  return `equipment-${UidFactory_generateUid(8)}`;
}

function linkExerciseLens(
  gymId: string,
  exerciseType: IExerciseType,
  equipmentId: string
): ILensRecordingPayload<IState> {
  const exerciseKey = Exercise_toKey(exerciseType);
  return lb<IState>()
    .p("storage")
    .p("settings")
    .p("exerciseData")
    .recordModify((all) => ({
      ...all,
      [exerciseKey]: { ...all[exerciseKey], equipment: { ...all[exerciseKey]?.equipment, [gymId]: equipmentId } },
    }));
}

export function EditEquipment_create(
  dispatch: IDispatch,
  settings: ISettings,
  gymId: string,
  name: string,
  type: IEquipmentSetup["type"],
  linkExercise?: IExerciseType
): string {
  const id = newEquipmentId();
  const data = EquipmentSetupEdit_newEquipment(EquipmentSetupEdit_default(type, settings.units), name);
  updateState(
    dispatch,
    [
      gymEquipmentLens(gymId).recordModify((all) => ({ ...all, [id]: data })),
      ...(linkExercise != null ? [linkExerciseLens(gymId, linkExercise, id)] : []),
    ],
    "Add new equipment"
  );
  return id;
}

export function EditEquipment_copyForExercise(
  dispatch: IDispatch,
  settings: ISettings,
  gymId: string,
  sourceId: string,
  exerciseType: IExerciseType
): string | undefined {
  const source = settings.gyms.find((g) => g.id === gymId)?.equipment[sourceId];
  if (source == null) {
    return undefined;
  }
  const id = newEquipmentId();
  const name = Exercise_get(exerciseType, settings.exercises).name;
  const data = EquipmentSetupEdit_newEquipment(Equipment_setupOf(source, settings), name);
  updateState(
    dispatch,
    [
      gymEquipmentLens(gymId).recordModify((all) => ({ ...all, [id]: data })),
      linkExerciseLens(gymId, exerciseType, id),
    ],
    "Copy equipment for exercise"
  );
  return id;
}

export function EditEquipment_update(
  dispatch: IDispatch,
  gymId: string,
  equipmentId: string,
  next: IEquipmentSetup
): string[] {
  const errors = EquipmentSetup_validate(next);
  if (errors.length > 0) {
    return errors;
  }
  updateState(
    dispatch,
    [
      gymEquipmentLens(gymId).recordModify((all) => {
        const current = all[equipmentId];
        return current == null ? all : { ...all, [equipmentId]: EquipmentSetupEdit_apply(current, next) };
      }),
    ],
    "Update equipment setup"
  );
  return [];
}

export function EditEquipment_setDeleted(
  dispatch: IDispatch,
  gymId: string,
  equipmentId: string,
  isDeleted: boolean
): void {
  updateState(
    dispatch,
    [gymEquipmentLens(gymId).then(lb<IAllEquipment>().pi(equipmentId).p("isDeleted").get()).record(isDeleted)],
    isDeleted ? "Delete equipment" : `Show equipment ${equipmentId}`
  );
}

export function EditEquipment_setText(
  dispatch: IDispatch,
  gymId: string,
  equipmentId: string,
  field: "name" | "notes",
  value: string
): void {
  const text = field === "name" ? value.trim() : value;
  if (field === "name" && text === "") {
    return;
  }
  updateState(
    dispatch,
    [gymEquipmentLens(gymId).then(lb<IAllEquipment>().pi(equipmentId).p(field).get()).record(text)],
    field === "name" ? "Change equipment name" : "Update equipment notes"
  );
}

export function EditEquipment_setDefaultRoundingForExercise(
  dispatch: IDispatch,
  exercise: IExerciseType,
  value: number
): void {
  if (isNaN(value)) {
    return;
  }

  updateState(
    dispatch,
    [
      lb<IState>()
        .p("storage")
        .p("settings")
        .p("exerciseData")
        .recordModify((data) => {
          const k = Exercise_toKey(exercise);
          return { ...data, [k]: { ...data[k], rounding: Math.max(value, 0.1) } };
        }),
    ],
    "Update rounding"
  );
}
