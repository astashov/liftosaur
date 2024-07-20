import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { PlannerContent } from "./plannerContent";
import { IExportedPlannerProgram } from "./models/types";
import { IAccount } from "../../models/account";
import { IPartialStorage } from "../../types";

interface IProps {
  initialProgram?: IExportedPlannerProgram;
  account?: IAccount;
  partialStorage?: IPartialStorage;
  client: Window["fetch"];
}

export function PlannerHtml(props: IProps): JSX.Element {
  const { client, ...rawData } = props;
  const data = { ...rawData, shouldSync: false };

  return (
    <Page
      account={props.account}
      css={["planner"]}
      js={["planner"]}
      maxWidth={1200}
      title="Web Editor"
      ogTitle="Liftosaur: Web Editor"
      ogDescription="The weightlifting program editor, allowing to balance volume, time and muscles worked"
      ogUrl="https://www.liftosaur.com/planner"
      data={data}
      url="/planner"
      client={client}
    >
      <PlannerContent client={client} {...data} />
    </Page>
  );
}
