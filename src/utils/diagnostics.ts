/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IState } from "../models/state";

const MAX_ACTIONS = 31;

interface IDiagnosticsAction {
  type: string;
  time?: string;
  desc?: string;
  [key: string]: any;
}

let lastState: IState | undefined;
let lastActions: IDiagnosticsAction[] = [];
let lastValidationErrors: string[] | undefined;

export function Diagnostics_setLastState(state: IState): void {
  lastState = state;
}

export function Diagnostics_getLastState(): IState | undefined {
  return lastState;
}

export function Diagnostics_recordAction(action: IDiagnosticsAction): void {
  lastActions = [action, ...lastActions.slice(0, MAX_ACTIONS - 1)];
}

export function Diagnostics_getLastActions(): IDiagnosticsAction[] {
  return lastActions;
}

export function Diagnostics_setLastValidationErrors(errors: string[]): void {
  lastValidationErrors = errors;
}

export function Diagnostics_getLastValidationErrors(): string[] | undefined {
  return lastValidationErrors;
}
