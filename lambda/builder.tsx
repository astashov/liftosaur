import { h } from "preact";

import { renderPage } from "./render";
import { BuilderHtml } from "../src/pages/builder/builderHtml";
import { IBuilderProgram } from "../src/pages/builder/models/types";

export function renderBuilderHtml(client: Window["fetch"], program?: IBuilderProgram): string {
  return renderPage(<BuilderHtml client={client} program={program} />);
}
