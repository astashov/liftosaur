import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { IAccount } from "../../models/account";
import { IExportedProgram } from "../../models/program";
import { IStorage } from "../../types";
import { HtmlUtils } from "../../utils/html";
import { ProgramContentSyncer } from "./programContentSyncer";

interface IProps {
  exportedProgram?: IExportedProgram;
  account?: IAccount;
  isMobile: boolean;
  shouldSyncProgram: boolean;
  storage?: IStorage;
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
      account={props.account}
      client={client}
      url="/program"
    >
      <ProgramContentSyncer client={client} {...data} />
    </Page>
  );
}
