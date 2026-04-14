import type { JSX } from "react";
import { ISettings } from "../types";
import { IEvaluatedProgram } from "../models/program";
import { SimpleMarkdown } from "./simpleMarkdown";

export interface IMarkdownDirectivesData {
  exercise?: { settings: ISettings };
  exerciseExample?: { settings: ISettings; evaluatedProgram: IEvaluatedProgram };
}

interface IProps {
  value: string;
  className?: string;
  truncate?: number;
  directivesData?: IMarkdownDirectivesData;
}

export function Markdown(props: IProps): JSX.Element {
  const stringValue = typeof props.value === "string" ? props.value : String(props.value ?? "");
  return <SimpleMarkdown value={stringValue} className={props.className} />;
}
