import { JSX } from "preact";
import render from "preact-render-to-string";

export function renderPage(page: JSX.Element): string {
  return "<!DOCTYPE html>" + render(page);
}
