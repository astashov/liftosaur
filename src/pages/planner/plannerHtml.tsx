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
      title="Workout Planner"
      ogTitle="Liftosaur: Workout Planner"
      ogDescription="The weightlifting program planner, allowing to balance volume, time and muscles worked"
      ogUrl="https://www.liftosaur.com/planner"
      data={data}
      url="/planner"
    >
      <PlannerContent client={client} {...data} />
    </Page>
  );
}
