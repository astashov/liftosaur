import { IProgram, ISettings } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";

export interface IProgramDetailsState {
  programs: IProgram[];
  selectedProgramId: string;
  shouldShowAllScripts: boolean;
  shouldShowAllFormulas: boolean;
  settings: ISettings;
}

export type IProgramDetailsDispatch = ILensDispatch<IProgramDetailsState>;
