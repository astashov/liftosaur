import { createContext, JSX } from "react";
import type { IDashboardEditorWidgetModalProps } from "./dashboardEditorWidgetModal";

export interface IDashboardEditorBrowserComponents {
  WidgetModal: (props: IDashboardEditorWidgetModalProps) => JSX.Element;
}

// Provided only by the browser entry: the widget modal pulls in the exercise picker, which imports
// react-navigation, and the lambda SSR bundle can't load its ESM.
export const DashboardEditorBrowserContext = createContext<IDashboardEditorBrowserComponents | undefined>(undefined);
