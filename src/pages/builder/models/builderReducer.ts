import { ILensRecordingPayload } from "lens-shmens";
import { IBuilderProgram, IBuilderUI } from "./types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IUndoRedoState } from "../utils/undoredo";

export interface IBuilderSettings {
  unit: "kg" | "lb";
}

export interface IBuilderState extends IUndoRedoState<{ program: IBuilderProgram }> {
  settings: IBuilderSettings;
  ui: IBuilderUI;
}

export type IBuilderDispatch = ILensDispatch<IBuilderState>;

export type IBuilderUpdateStateAction = {
  type: "UpdateState";
  lensRecording: ILensRecordingPayload<IBuilderState>[];
  desc?: string;
};

export type IBuilderAction = IBuilderUpdateStateAction;
