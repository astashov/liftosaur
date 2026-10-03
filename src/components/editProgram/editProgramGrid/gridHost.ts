import { IEvaluatedProgram } from "../../../models/program";
import { ISettings } from "../../../types";
import { IPlannerState } from "../../../pages/planner/models/types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IProgramGrid, IProgramGridPlacement } from "../../../pages/planner/models/programGrid";

export interface IGridNavigation {
  onEditPlacement?: (placement: IProgramGridPlacement) => void;
  onDuplicatePlacement: (placement: IProgramGridPlacement) => void;
  onSwapPlacement: (placement: IProgramGridPlacement) => void;
  onAddExercise: (weekIndex: number, rowIndex: number) => void;
  onShowWeekStats: (weekIndex: number) => void;
  onShowDayStats: (rowIndex: number) => void;
  onShowExerciseStats: (placement: IProgramGridPlacement) => void;
}

export interface IGridNavigationContext {
  grid: IProgramGrid;
  evaluatedProgram: IEvaluatedProgram;
  settings: ISettings;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export interface IGridEditDetailsRequest {
  title: string;
  name: string;
  description?: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  dataCyPrefix: string;
}

export interface IGridEditDetailsResult {
  name: string;
  description?: string;
}

export interface IGridHost {
  createNavigation: (context: IGridNavigationContext) => IGridNavigation;
  openEditDetails: (request: IGridEditDetailsRequest, onResult: (details?: IGridEditDetailsResult) => void) => void;
}
