import { JSX, ReactNode, createContext, useContext, useReducer, useEffect, useRef, useCallback } from "react";
import type {
  IMuscle,
  IExerciseKind,
  IExerciseType,
  IExercisePickerSelectedExercise,
  IDayData,
  IPlannerProgram,
  IProgramState,
  IProgramStateMetadata,
} from "../types";
import type { IEvaluatedProgram } from "../models/program";
import { getNavigationRef } from "./navUtils";
import { UidFactory_generateUid } from "../utils/generator";
import type { IStateVariableType } from "../components/editProgramExercise/progressions/modalCreateStateVariable";
import type { ILiftoEditorAcrossField, ILiftoEditorStateVarEntry } from "../components/primitives/liftoEditorActions";

export interface IInputSelectModalData {
  name?: string;
  values: [string, string][];
  hint?: string;
  selectedValue?: string;
  placeholder?: string;
  emptyLabel?: string;
}

export interface ITextInputModalData {
  title: string;
  inputLabel: string;
  placeholder: string;
  submitLabel: string;
  dataCyPrefix: string;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
}

export interface IRepMaxCalculatorModalData {
  unit: "kg" | "lb";
}

export interface IExerciseTypesPickerModalData {
  selectedTypes: IExerciseKind[];
}

export interface IExerciseMusclesPickerModalData {
  title: string;
  name: string;
  selectedMuscles: IMuscle[];
}

export interface IExerciseImageLibraryResult {
  smallImageUrl?: string;
  largeImageUrl?: string;
}

export interface IExerciseCloneLibraryResult {
  smallImageUrl?: string;
  largeImageUrl?: string;
  targetMuscles: IMuscle[];
  synergistMuscles: IMuscle[];
  types: IExerciseKind[];
}

export interface ILiftoEditorExercisePickerModalData {
  exerciseType?: IExerciseType;
  label?: string;
  templateName?: string;
  // Handed over rather than looked up by id: while the program editor is open the program
  // that matters is the unsaved draft, and only the opener knows which one that is.
  evaluatedProgram?: IEvaluatedProgram;
  dayData?: Required<IDayData>;
  // Exercises on that day that must not count as "already used", because they *are* the slot
  // being edited — the one the program still has there and the one the unsaved text now names.
  // Without this the picker disables the exercise you are replacing, so a swap can't be undone.
  excludeUsedExerciseTypes?: IExerciseType[];
}

export interface IStateVarsModalData {
  // What custom()'s parens hold, as the syntax tree read it; the result is the same list,
  // rewritten.
  entries: ILiftoEditorStateVarEntry[];
  hasUnparsed: boolean;
  defaults?: IProgramState;
  defaultsMetadata?: IProgramStateMetadata;
  sourceName?: string;
  progressScript?: string;
  updateScript?: string;
  exerciseType?: IExerciseType;
}

export interface ICreateStateVarModalResult {
  name: string;
  type: IStateVariableType;
  isUserPrompted: boolean;
}

// Retuning one exercise's sets across every week that shares a value. Planner in, planner out —
// nothing about the program around it is read. Handed over rather than looked up by id because
// the opener may be holding edits that aren't in app state yet, and the grouping has to be of
// what the user can actually see.
export interface IAcrossProgramModalData {
  planner: IPlannerProgram;
  exerciseKey: string;
  exerciseFullName: string;
  field: ILiftoEditorAcrossField;
}

export interface IModalDataMap {
  inputSelectModal: IInputSelectModalData;
  acrossProgramModal: IAcrossProgramModalData;
  stateVarsModal: IStateVarsModalData;
  createStateVarModal: { existingNames?: string[] };
  liftoEditorExercisePickerModal: ILiftoEditorExercisePickerModalData;
  textInputModal: ITextInputModalData;
  repMaxCalculatorModal: IRepMaxCalculatorModalData;
  exerciseTypesPickerModal: IExerciseTypesPickerModalData;
  exerciseMusclesPickerModal: IExerciseMusclesPickerModalData;
  exerciseImageSourceModal: { exerciseId: string };
  exerciseImageLibraryModal: {};
  exerciseCloneLibraryModal: {};
  photoPickerModal: {};
}

export interface IModalResultMap {
  inputSelectModal: string;
  // The rewritten program. The opener decides where it goes — pending in a sheet, or straight
  // into a lens — so this modal never writes to app state itself.
  acrossProgramModal: IPlannerProgram;
  stateVarsModal: string;
  createStateVarModal: ICreateStateVarModalResult;
  liftoEditorExercisePickerModal: IExercisePickerSelectedExercise;
  textInputModal: string;
  repMaxCalculatorModal: number;
  exerciseTypesPickerModal: IExerciseKind[];
  exerciseMusclesPickerModal: IMuscle[];
  exerciseImageSourceModal: IExerciseImageLibraryResult;
  exerciseImageLibraryModal: IExerciseImageLibraryResult;
  exerciseCloneLibraryModal: IExerciseCloneLibraryResult;
  photoPickerModal: string;
}

export interface IModalState {
  modals: Partial<IModalDataMap>;
  results: Partial<IModalResultMap>;
  // Who opened each modal last. Several components can hold a useModal hook for the same
  // key (one per mounted day editor), and a result is delivered to the one that asked for
  // it — a canceled opener would otherwise stay armed and take the next opener's result.
  owners: Partial<Record<keyof IModalDataMap, string>>;
}

type IModalAction =
  | { type: "open"; key: string; data: unknown; owner?: string }
  | { type: "clear"; key: string }
  | { type: "setResult"; key: string; value: unknown }
  | { type: "clearResult"; key: string };

function modalReducer(state: IModalState, action: IModalAction): IModalState {
  switch (action.type) {
    case "open":
      return {
        ...state,
        modals: { ...state.modals, [action.key]: action.data },
        owners: { ...state.owners, [action.key]: action.owner },
      };
    case "clear": {
      const { [action.key]: _, ...rest } = state.modals as Record<string, unknown>;
      return { ...state, modals: rest as Partial<IModalDataMap> };
    }
    case "setResult":
      return { ...state, results: { ...state.results, [action.key]: action.value } };
    case "clearResult": {
      const { [action.key]: _, ...rest } = state.results as Record<string, unknown>;
      return { ...state, results: rest as Partial<IModalResultMap> };
    }
    default:
      return state;
  }
}

const initialModalState: IModalState = { modals: {}, results: {}, owners: {} };

export type IModalDispatch = (action: IModalAction) => void;

const noopModalDispatch: IModalDispatch = () => {};

const ModalStateContext = createContext<IModalState>(initialModalState);
const ModalDispatchContext = createContext<IModalDispatch>(noopModalDispatch);

export function ModalStateProvider(props: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(modalReducer, initialModalState);
  return (
    <ModalDispatchContext.Provider value={dispatch}>
      <ModalStateContext.Provider value={state}>{props.children}</ModalStateContext.Provider>
    </ModalDispatchContext.Provider>
  );
}

export function useIsModalAvailable(): boolean {
  return useContext(ModalDispatchContext) !== noopModalDispatch;
}

export function useModalState(): IModalState {
  return useContext(ModalStateContext);
}

export function useModalDispatch(): IModalDispatch {
  return useContext(ModalDispatchContext);
}

export function useModalData<K extends keyof IModalDataMap>(key: K): IModalDataMap[K] | undefined {
  const state = useModalState();
  return state.modals[key];
}

export function Modal_open<K extends keyof IModalDataMap>(
  dispatch: IModalDispatch,
  key: K,
  data: IModalDataMap[K],
  owner?: string
): void {
  dispatch({ type: "open", key, data, owner });
}

export function Modal_setResult<K extends keyof IModalResultMap>(
  dispatch: IModalDispatch,
  key: K,
  value: IModalResultMap[K]
): void {
  dispatch({ type: "setResult", key, value });
}

export function Modal_clear(dispatch: IModalDispatch, key: keyof IModalDataMap): void {
  dispatch({ type: "clear", key });
}

export function useModalResult<K extends keyof IModalResultMap>(
  key: K,
  callback: (value: IModalResultMap[K]) => void
): void {
  const state = useModalState();
  const dispatch = useModalDispatch();
  const result = state.results[key];
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  useEffect(() => {
    if (result !== undefined) {
      dispatch({ type: "clearResult", key });
      callbackRef.current(result as IModalResultMap[K]);
    }
  }, [result]);
}

export function useModal<K extends keyof IModalDataMap & keyof IModalResultMap>(
  key: K,
  callback: (value: IModalResultMap[K]) => void
): (data: IModalDataMap[K]) => void {
  const state = useModalState();
  const dispatch = useModalDispatch();
  const result = state.results[key];
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const isOpenRef = useRef(false);
  const idRef = useRef<string | undefined>(undefined);
  if (idRef.current == null) {
    idRef.current = UidFactory_generateUid(8);
  }
  // Closing without a result leaves this hook armed — nothing tells it the modal went away.
  // Ownership is what retires it: the next opener takes the key, and only the owner is
  // allowed to consume a result.
  const isOwner = state.owners[key] === idRef.current;

  useEffect(() => {
    if (result != null && isOpenRef.current && isOwner) {
      isOpenRef.current = false;
      dispatch({ type: "clearResult", key });
      callbackRef.current(result as IModalResultMap[K]);
    }
  }, [result, dispatch, key, isOwner]);

  return useCallback(
    (data: IModalDataMap[K]) => {
      isOpenRef.current = true;
      Modal_open(dispatch, key, data, idRef.current);
      getNavigationRef().then(({ navigationRef: ref }) => ref.navigate(key as never));
    },
    [dispatch, key]
  );
}
