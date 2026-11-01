import { Dashboard_current, Dashboard_fromLegacyGraphs } from "../models/dashboard";
import { IStorage } from "../types";

export interface ILiftographDashboardDocument {
  dashboardId: string;
  name: string;
  text: string;
  origin: "persisted" | "fallback";
}

export function LiftographDashboard_isHeading(markdown: string): boolean {
  const text = markdown.trim();
  return /^#{1,6}\s/.test(text) && text.indexOf("\n") === -1;
}

export function LiftographDashboard_document(
  storage: Pick<IStorage, "dashboards" | "currentDashboardId" | "settings">
): ILiftographDashboardDocument {
  const current = Dashboard_current(storage);
  const dashboard = current ?? Dashboard_fromLegacyGraphs(storage.settings);
  return {
    dashboardId: dashboard.id,
    name: dashboard.name,
    text: dashboard.text,
    origin: current != null ? "persisted" : "fallback",
  };
}

export function LiftographDashboard_widgetKey(rowIndex: number, itemIndex: number, sourceText: string): string {
  return `${rowIndex}:${itemIndex}:${sourceText}`;
}
