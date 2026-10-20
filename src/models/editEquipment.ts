import { ILensRecordingPayload, Lens, lb } from "lens-shmens";
import { IState, updateState } from "./state";
import { IDispatch } from "../ducks/types";
import { IAllEquipment, IExerciseType, IEquipment, IEquipmentSetup, ISettings, IUnit } from "../types";
import { Equipment_getEquipmentIdForExerciseType, Equipment_isBuiltIn, Equipment_setupOf } from "./equipment";
import { EquipmentDefaults_build } from "./equipmentDefaults";
import { equipmentName, Exercise_get, Exercise_toKey } from "./exercise";
import { UidFactory_generateUid } from "../utils/generator";
import { StringUtils_nextName } from "../utils/string";
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
  equipmentId: string | undefined
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
  const data = EquipmentSetupEdit_newEquipment(EquipmentSetupEdit_default(type, settings.units), name, settings.units);
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
  const data = EquipmentSetupEdit_newEquipment(Equipment_setupOf(source, settings), name, settings.units);
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

export function EditEquipment_copyName(allEquipment: IAllEquipment, sourceId: string): string {
  const taken = new Set(
    Object.keys(allEquipment)
      .filter((key) => !allEquipment[key]?.isDeleted)
      .map((key) => equipmentName(key, allEquipment).toLowerCase())
  );
  let name = StringUtils_nextName(equipmentName(sourceId, allEquipment));
  while (taken.has(name.toLowerCase())) {
    name = StringUtils_nextName(name);
  }
  return name;
}

export function EditEquipment_copyListConfirmText(allEquipment: IAllEquipment, sourceId: string): string {
  const source = equipmentName(sourceId, allEquipment);
  const name = EditEquipment_copyName(allEquipment, sourceId);
  return `Create "${name}", a copy of ${source}? No exercise uses it until you pick it for one.`;
}

export function EditEquipment_copy(
  dispatch: IDispatch,
  settings: ISettings,
  gymId: string,
  sourceId: string
): string | undefined {
  const all = settings.gyms.find((g) => g.id === gymId)?.equipment;
  const source = all?.[sourceId];
  if (all == null || source == null) {
    return undefined;
  }
  const id = newEquipmentId();
  const name = EditEquipment_copyName(all, sourceId);
  const data = EquipmentSetupEdit_newEquipment(Equipment_setupOf(source, settings), name, settings.units);
  updateState(
    dispatch,
    [gymEquipmentLens(gymId).recordModify((current) => ({ ...current, [id]: data }))],
    "Copy equipment"
  );
  return id;
}

function gymSuffix(settings: ISettings, gymId: string): string {
  const gym = settings.gyms.find((g) => g.id === gymId);
  return settings.gyms.length > 1 && gym != null ? ` in ${gym.name}` : "";
}

export function EditEquipment_copyConfirmText(
  settings: ISettings,
  gymId: string,
  sourceId: string,
  exerciseType: IExerciseType
): string {
  const equipment = settings.gyms.find((g) => g.id === gymId)?.equipment;
  const source = equipmentName(sourceId, equipment);
  const exercise = Exercise_get(exerciseType, settings.exercises).name;
  return `This creates new equipment "${exercise}", a copy of ${source}. Only ${exercise} uses it${gymSuffix(settings, gymId)}. Other exercises keep using ${source}.`;
}

export interface IEquipmentRemoval {
  label: string;
  confirm: string;
}

function fallbackEquipment(
  settings: ISettings,
  gymId: string,
  removedId: string,
  exerciseType: IExerciseType
): string | undefined {
  const fallbackId = exerciseType.equipment;
  const data = fallbackId != null ? settings.gyms.find((g) => g.id === gymId)?.equipment[fallbackId] : undefined;
  return fallbackId !== removedId && data != null && !data.isDeleted ? fallbackId : undefined;
}

export function EditEquipment_removal(
  settings: ISettings,
  gymId: string,
  equipmentId: string,
  exerciseType: IExerciseType
): IEquipmentRemoval {
  const equipment = settings.gyms.find((g) => g.id === gymId)?.equipment;
  const name = equipmentName(equipmentId, equipment);
  if (Equipment_isBuiltIn(equipmentId)) {
    return {
      label: `Hide ${name}`,
      confirm: `Hide ${name}${gymSuffix(settings, gymId)}? It disappears from the equipment lists. You can show it again in Me → Available Equipment.`,
    };
  }
  const exercise = Exercise_get(exerciseType, settings.exercises).name;
  const fallbackId = fallbackEquipment(settings, gymId, equipmentId, exerciseType);
  const after = fallbackId != null ? `goes back to ${equipmentName(fallbackId, equipment)}` : "has no equipment";
  return {
    label: `Delete ${name}`,
    confirm: `Delete ${name}${gymSuffix(settings, gymId)}? ${exercise} ${after} after that.`,
  };
}

export function EditEquipment_removeForExercise(
  dispatch: IDispatch,
  settings: ISettings,
  gymId: string,
  equipmentId: string,
  exerciseType: IExerciseType
): void {
  const hide = gymEquipmentLens(gymId).then(lb<IAllEquipment>().pi(equipmentId).p("isDeleted").get()).record(true);
  const relink = Equipment_isBuiltIn(equipmentId)
    ? []
    : [linkExerciseLens(gymId, exerciseType, fallbackEquipment(settings, gymId, equipmentId, exerciseType))];
  updateState(dispatch, [hide, ...relink], "Delete equipment");
}

export function EditEquipment_update(
  dispatch: IDispatch,
  gymId: string,
  equipmentId: string,
  next: IEquipmentSetup,
  appUnit: IUnit
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
        return current == null ? all : { ...all, [equipmentId]: EquipmentSetupEdit_apply(current, next, appUnit) };
      }),
    ],
    "Update equipment setup"
  );
  return [];
}

export function EditEquipment_addGym(dispatch: IDispatch, name: string, unit: IUnit): void {
  const id = `gym-${UidFactory_generateUid(8)}`;
  const equipment = EquipmentDefaults_build(unit);
  updateState(
    dispatch,
    [
      lb<IState>()
        .p("storage")
        .p("settings")
        .p("gyms")
        .recordModify((gyms) => [...gyms, { vtype: "gym" as const, id, name, equipment }]),
    ],
    "Add new gym"
  );
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
