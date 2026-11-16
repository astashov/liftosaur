import type { JSX } from "react";
import { Page } from "../../components/page";
import { PlannerContent } from "./plannerContent";
import { IPlannerFriendTarget } from "./models/plannerProgramSave";
import { IAccount } from "../../models/account";
import { IPartialStorage } from "../../types";
import { HtmlUtils_escapeHtml } from "../../utils/html";
import { IExportedProgram } from "../../models/program";

interface IProps {
  initialProgram?: IExportedProgram;
  account?: IAccount;
  userAgent?: string;
  partialStorage?: IPartialStorage;
  client: Window["fetch"];
  revisions: string[];
  friendTarget?: IPlannerFriendTarget;
}

export function PlannerHtml(props: IProps): JSX.Element {
  const { client, ...rawData } = props;
  const data = { ...rawData, shouldSync: props.friendTarget != null };
  const programName = data.initialProgram?.program?.name;
  const title =
    programName != null
      ? `${HtmlUtils_escapeHtml(programName)} | Workout Editor | Liftosaur`
      : "Weightlifting Workout Planner | Liftosaur";

  return (
    <Page
      isLoggedIn={!!props.account}
      css={["planner"]}
      js={["planner"]}
      maxWidth={1440}
      maxBodyWidth={2400}
      title={title}
      description="The weightlifting program editor, that helps to balance volume, time and muscles worked"
      canonical="https://www.liftosaur.com/planner"
      ogUrl="https://www.liftosaur.com/planner"
      data={data}
      url="/planner"
      client={client}
      postHead={<script>window.webeditor = true</script>}
    >
      <PlannerContent client={client} {...data} />
    </Page>
  );
}
