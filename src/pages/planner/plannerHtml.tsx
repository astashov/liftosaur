import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { PlannerContent } from "./plannerContent";
import { IExportedPlannerProgram } from "./models/types";

interface IProps {
  initialProgram?: IExportedPlannerProgram;
  client: Window["fetch"];
}

export function PlannerHtml(props: IProps): JSX.Element {
  const { client, ...data } = props;

  return (
    <Page
      css={["planner"]}
      js={["planner"]}
      maxWidth={1200}
      title="Workout Program Planner"
      ogTitle="Liftosaur: Workout Program Builder"
      ogDescription="The weightlifting program planner, allowing to balance volume, time and muscles worked"
      ogUrl="https://www.liftosaur.com/planner"
      data={data}
    >
      <PlannerContent client={client} {...data} />
    </Page>
  );
}
