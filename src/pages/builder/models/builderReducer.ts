import { ILensRecordingPayload } from "lens-shmens";
import { IBuilderProgram, IBuilderUI } from "./types";
import { ILensDispatch } from "../../../utils/useLensReducer";

export interface IBuilderSettings {
  unit: "kg" | "lb";
}

export interface IBuilderState {
  program: IBuilderProgram;
  settings: IBuilderSettings;
  history: {
    past: IBuilderProgram[];
    future: IBuilderProgram[];
  };
  ui: IBuilderUI;
}

export type IBuilderDispatch = ILensDispatch<IBuilderState>;

export type IBuilderUpdateStateAction = {
  type: "UpdateState";
  lensRecording: ILensRecordingPayload<IBuilderState>[];
  desc?: string;
};

export type IBuilderAction = IBuilderUpdateStateAction;
