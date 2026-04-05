import { JSX, ReactNode, createContext, useContext, useReducer, useEffect, useRef, useCallback } from "react";
import type { IMuscle, IExerciseKind } from "../types";
import { getNavigationRef } from "./navUtils";

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

export interface IModalDataMap {
  inputSelectModal: IInputSelectModalData;
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
}

type IModalAction =
  | { type: "open"; key: string; data: unknown }
  | { type: "clear"; key: string }
  | { type: "setResult"; key: string; value: unknown }
  | { type: "clearResult"; key: string };

function modalReducer(state: IModalState, action: IModalAction): IModalState {
  switch (action.type) {
    case "open":
      return { ...state, modals: { ...state.modals, [action.key]: action.data } };
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

const initialModalState: IModalState = { modals: {}, results: {} };

export type IModalDispatch = (action: IModalAction) => void;

const ModalStateContext = createContext<IModalState>(initialModalState);
const ModalDispatchContext = createContext<IModalDispatch>(() => {});

export function ModalStateProvider(props: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(modalReducer, initialModalState);
  return (
    <ModalDispatchContext.Provider value={dispatch}>
      <ModalStateContext.Provider value={state}>{props.children}</ModalStateContext.Provider>
    </ModalDispatchContext.Provider>
  );
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
  data: IModalDataMap[K]
): void {
  dispatch({ type: "open", key, data });
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

  useEffect(() => {
    if (result != null && isOpenRef.current) {
      isOpenRef.current = false;
      dispatch({ type: "clearResult", key });
      callbackRef.current(result as IModalResultMap[K]);
    }
  }, [result, dispatch, key]);

  return useCallback(
    (data: IModalDataMap[K]) => {
      isOpenRef.current = true;
      Modal_open(dispatch, key, data);
      getNavigationRef().then(({ navigationRef: ref }) => ref.navigate(key as never));
    },
    [dispatch, key]
  );
}
