import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { PlannerContent } from "./plannerContent";
import { IAccount } from "../../models/account";
import { IPartialStorage } from "../../types";
import { HtmlUtils } from "../../utils/html";
import { IExportedProgram } from "../../models/program";

interface IProps {
  initialProgram?: IExportedProgram;
  account?: IAccount;
  partialStorage?: IPartialStorage;
  client: Window["fetch"];
  revisions: string[];
}

export function PlannerHtml(props: IProps): JSX.Element {
  const { client, ...rawData } = props;
  const data = { ...rawData, shouldSync: false };
  const programName = data.initialProgram?.program?.name;
  const title =
    programName != null
      ? `${HtmlUtils.escapeHtml(programName)} | Workout Editor | Liftosaur`
      : "Weightlifting Workout Planner | Liftosaur";

  return (
    <Page
      account={props.account}
      css={["planner"]}
      js={["planner"]}
      maxWidth={1200}
      maxBodyWidth={2400}
      title={title}
      description="The weightlifting program editor, that helps to balance volume, time and muscles worked"
      canonical="https://www.liftosaur.com/planner"
      ogUrl="https://www.liftosaur.com/planner"
      data={data}
      url="/planner"
      client={client}
    >
      <PlannerContent client={client} {...data} />
    </Page>
  );
}
