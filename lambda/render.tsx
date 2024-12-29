import { JSX } from "react";
import { renderToString } from "react-dom/server";

export function renderPage(page: JSX.Element): string {
  return "<!DOCTYPE html>" + renderToString(page);
}
