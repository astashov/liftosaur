import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { IAccount } from "../../models/account";
import { IExportedProgram } from "../../models/program";
import { IStorage } from "../../types";
import { HtmlUtils } from "../../utils/html";
import { ProgramOrPlannerSyncer } from "./programOrPlannerSyncer";

interface IProps {
  exportedProgram?: IExportedProgram;
  account?: IAccount;
  isMobile: boolean;
  shouldSyncProgram: boolean;
  revisions: string[];
  currentRevision?: string;
  storage?: IStorage;
  client: Window["fetch"];
}

export function ProgramHtml(props: IProps): JSX.Element {
  const { client, ...data } = props;
  const programName = data.exportedProgram?.program?.name;
  const title =
    programName != null
      ? `${HtmlUtils.escapeHtml(programName)} | Workout Editor | Liftosaur`
      : "Weightlifting Workout Planner | Liftosaur";
  const url = "https://www.liftosaur.com" + (data.exportedProgram?.program?.planner ? "/planner" : "/program");

  return (
    <Page
      css={["program"]}
      js={["program"]}
      maxWidth={1200}
      title={title}
      description="The weightlifting program editor"
      canonical={url}
      ogUrl={url}
      data={data}
      account={props.account}
      client={client}
      url={data.exportedProgram?.program?.planner ? "/planner" : "/program"}
    >
      <ProgramOrPlannerSyncer client={client} {...data} />
    </Page>
  );
}
