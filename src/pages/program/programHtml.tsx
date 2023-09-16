import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { IExportedProgram } from "../../models/program";
import { HtmlUtils } from "../../utils/html";
import { ProgramContent } from "./programContent";

interface IProps {
  exportedProgram?: IExportedProgram;
  isMobile: boolean;
  client: Window["fetch"];
}

export function ProgramHtml(props: IProps): JSX.Element {
  const { client, ...data } = props;
  const title = HtmlUtils.escapeHtml(data.exportedProgram?.program?.name || "Program Builder");

  return (
    <Page
      css={["program"]}
      js={["program"]}
      maxWidth={1200}
      title={title}
      ogTitle="Liftosaur: Program Builder"
      ogDescription="The program builder for the Liftosaur app"
      ogUrl="https://www.liftosaur.com/builder"
      data={data}
      url="/program"
    >
      <ProgramContent client={client} {...data} />
    </Page>
  );
}
