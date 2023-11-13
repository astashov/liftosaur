import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { BuilderContent } from "./builderContent";
import { IBuilderProgram } from "./models/types";

interface IProps {
  program?: IBuilderProgram;
  client: Window["fetch"];
}

export function BuilderHtml(props: IProps): JSX.Element {
  const { client, ...data } = props;

  return (
    <Page
      css={["builder"]}
      js={["builder"]}
      maxWidth={1020}
      title="Workout Program Planner"
      ogTitle="Liftosaur: Workout Program Builder"
      ogDescription="The weightlifting program builder, allowing to balance volume, time and muscles worked"
      ogUrl="https://www.liftosaur.com/planner"
      data={data}
      client={client}
    >
      <BuilderContent client={client} {...data} />
    </Page>
  );
}
