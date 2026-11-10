import { IDashboard, ISettings } from "../types";
import { IEither } from "../utils/types";
import { LiftographCompile_document } from "../liftograph/liftographCompile";
import { ILiftographDiagnostic, LiftographDocument_parse } from "../liftograph/liftographDocument";
import { Dashboard_current } from "./dashboard";
import {
  DashboardWebSave_create,
  DashboardWebSave_delete,
  DashboardWebSave_select,
  DashboardWebSave_update,
  IDashboardWebSaveResult,
  IDashboardWebStorage,
} from "./dashboardWebSave";

export interface IDashboardApiDetail {
  line: number;
  offset: number;
  from: number;
  to: number;
  message: string;
}

export interface IDashboardApiSummary {
  id: string;
  name: string;
  isCurrent: boolean;
}

export interface IDashboardApiDashboard extends IDashboardApiSummary {
  text: string;
}

export const DashboardApi_currentId = "current";
export const DashboardApi_defaultName = "New Dashboard";

export interface IDashboardApiCreateInput {
  name: string;
  text: string;
  makeCurrent: boolean;
}

export interface IDashboardApiUpdateInput {
  name?: string;
  text?: string;
  makeCurrent?: boolean;
}

export interface IDashboardApiParseOptions {
  acceptsBooleanStrings: boolean;
}

type IField<T> = IEither<T | undefined, string>;

function typeName(value: unknown): string {
  return Array.isArray(value) ? "array" : typeof value;
}

function stringField(body: Record<string, unknown>, key: string): IField<string> {
  const value = body[key];
  if (value == null) {
    return { success: true, data: undefined };
  }
  return typeof value === "string"
    ? { success: true, data: value }
    : { success: false, error: `'${key}' must be a string, got ${typeName(value)}` };
}

function booleanField(body: Record<string, unknown>, key: string, options: IDashboardApiParseOptions): IField<boolean> {
  const value = body[key];
  if (value == null) {
    return { success: true, data: undefined };
  } else if (typeof value === "boolean") {
    return { success: true, data: value };
  } else if (options.acceptsBooleanStrings && (value === "true" || value === "false")) {
    return { success: true, data: value === "true" };
  }
  return { success: false, error: `'${key}' must be true or false, got ${JSON.stringify(value)}` };
}

export function DashboardApi_parseCreate(
  body: Record<string, unknown>,
  options: IDashboardApiParseOptions
): IEither<IDashboardApiCreateInput, string> {
  const name = stringField(body, "name");
  const text = stringField(body, "text");
  const makeCurrent = booleanField(body, "makeCurrent", options);
  if (!name.success || !text.success || !makeCurrent.success) {
    return firstError([name, text, makeCurrent]);
  }
  if (text.data == null) {
    return { success: false, error: "Missing 'text' field (the Liftograph dashboard source)" };
  }
  return {
    success: true,
    data: {
      name: name.data?.trim() || DashboardApi_defaultName,
      text: text.data,
      makeCurrent: makeCurrent.data ?? true,
    },
  };
}

export function DashboardApi_parseUpdate(
  body: Record<string, unknown>,
  options: IDashboardApiParseOptions
): IEither<IDashboardApiUpdateInput, string> {
  const name = stringField(body, "name");
  const text = stringField(body, "text");
  const makeCurrent = booleanField(body, "makeCurrent", options);
  if (!name.success || !text.success || !makeCurrent.success) {
    return firstError([name, text, makeCurrent]);
  }
  if (name.data != null && name.data.trim() === "") {
    return { success: false, error: "'name' can't be empty" };
  }
  if (name.data == null && text.data == null && makeCurrent.data == null) {
    return { success: false, error: "Pass at least one of 'name', 'text' or 'makeCurrent'" };
  }
  return { success: true, data: { name: name.data?.trim(), text: text.data, makeCurrent: makeCurrent.data } };
}

export function DashboardApi_parsePreview(body: Record<string, unknown>): IEither<{ text: string }, string> {
  const text = stringField(body, "text");
  if (!text.success) {
    return text;
  }
  return text.data != null
    ? { success: true, data: { text: text.data } }
    : { success: false, error: "Missing 'text' field (the Liftograph dashboard source)" };
}

function firstError<T>(fields: IField<unknown>[]): IEither<T, string> {
  for (const field of fields) {
    if (!field.success) {
      return { success: false, error: field.error };
    }
  }
  return { success: false, error: "Invalid input" };
}

export function DashboardApi_details(text: string, diagnostics: ILiftographDiagnostic[]): IDashboardApiDetail[] {
  return diagnostics.map((diagnostic) => {
    const before = text.slice(0, diagnostic.span.from);
    const lineStart = before.lastIndexOf("\n") + 1;
    return {
      line: before.split("\n").length,
      offset: diagnostic.span.from - lineStart + 1,
      from: diagnostic.span.from,
      to: diagnostic.span.to,
      message: diagnostic.message,
    };
  });
}

export function DashboardApi_compileErrors(text: string, settings: ISettings): IDashboardApiDetail[] {
  return DashboardApi_details(text, LiftographCompile_document(LiftographDocument_parse(text), settings).diagnostics);
}

function resolve(storage: IDashboardWebStorage, id: string): IDashboard | undefined {
  return id === DashboardApi_currentId
    ? Dashboard_current(storage)
    : (storage.dashboards ?? []).find((d) => d.id === id);
}

export function DashboardApi_toApi(storage: IDashboardWebStorage, dashboard: IDashboard): IDashboardApiDashboard {
  return {
    id: dashboard.id,
    name: dashboard.name,
    text: dashboard.text,
    isCurrent: Dashboard_current(storage)?.id === dashboard.id,
  };
}

export function DashboardApi_list(storage: IDashboardWebStorage): IDashboardApiSummary[] {
  const currentId = Dashboard_current(storage)?.id;
  return (storage.dashboards ?? []).map((d) => ({ id: d.id, name: d.name, isCurrent: d.id === currentId }));
}

export function DashboardApi_get(
  storage: IDashboardWebStorage,
  id: string
): IEither<IDashboardApiDashboard, { status: 404; message: string }> {
  const dashboard = resolve(storage, id);
  return dashboard != null
    ? { success: true, data: DashboardApi_toApi(storage, dashboard) }
    : { success: false, error: { status: 404, message: "Dashboard not found" } };
}

export function DashboardApi_resolveId(storage: IDashboardWebStorage, id: string): string | undefined {
  return resolve(storage, id)?.id;
}

function invalidText(text: string, settings: ISettings): IDashboardWebSaveResult | undefined {
  const details = DashboardApi_compileErrors(text, settings);
  return details.length > 0 ? { kind: "error", status: 422, message: "Invalid dashboard text", details } : undefined;
}

function selected(result: IDashboardWebSaveResult, id: string, makeCurrent: boolean): IDashboardWebSaveResult {
  return result.kind === "write" && makeCurrent ? DashboardWebSave_select(result, id) : result;
}

export function DashboardApi_create(
  storage: IDashboardWebStorage,
  settings: ISettings,
  input: { id: string; name: string; text: string; makeCurrent: boolean }
): IDashboardWebSaveResult {
  const invalid = invalidText(input.text, settings);
  if (invalid != null) {
    return invalid;
  }
  const dashboard: IDashboard = { vtype: "dashboard", id: input.id, name: input.name, text: input.text };
  return selected(DashboardWebSave_create(storage, { dashboard }), input.id, input.makeCurrent);
}

export function DashboardApi_delete(storage: IDashboardWebStorage, id: string): IDashboardWebSaveResult {
  const existing = resolve(storage, id);
  return existing != null
    ? DashboardWebSave_delete(storage, existing.id)
    : { kind: "error", status: 404, message: "Dashboard not found" };
}

export function DashboardApi_update(
  storage: IDashboardWebStorage,
  settings: ISettings,
  id: string,
  input: { name?: string; text?: string; makeCurrent?: boolean }
): IDashboardWebSaveResult {
  const existing = resolve(storage, id);
  if (existing == null) {
    return { kind: "error", status: 404, message: "Dashboard not found" };
  }
  if (input.text != null) {
    const invalid = invalidText(input.text, settings);
    if (invalid != null) {
      return invalid;
    }
  }
  const unchanged: IDashboardWebSaveResult = {
    kind: "write",
    dashboards: storage.dashboards ?? [],
    currentDashboardId: storage.currentDashboardId,
  };
  const edited =
    input.name != null || input.text != null
      ? DashboardWebSave_update(storage, existing.id, {
          dashboard: { name: input.name ?? existing.name, text: input.text ?? existing.text },
        })
      : unchanged;
  return selected(edited, existing.id, !!input.makeCurrent);
}
