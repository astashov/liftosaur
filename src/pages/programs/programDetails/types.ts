import { IProgram, ISettings } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";

export type IProgramDetailsMuscles =
  | {
      dayIndex: number;
      type: "day";
    }
  | { type: "program" };

export interface IProgramDetailsState {
  programs: IProgram[];
  selectedProgramId: string;
  shouldShowAllScripts: boolean;
  shouldShowAllFormulas: boolean;
  settings: ISettings;
  muscles?: IProgramDetailsMuscles;
}

export type IProgramDetailsDispatch = ILensDispatch<IProgramDetailsState>;
