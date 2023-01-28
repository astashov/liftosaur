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
      maxWidth={920}
      title="Liftosaur: Workout Program Builder"
      ogTitle="Liftosaur: Workout Program Builder"
      ogDescription="The weightlifting program builder, allowing to balance volume, time and muscles worked"
      ogUrl="https://www.liftosaur.com/builder"
      data={data}
      skipFooter={true}
      skipTopNavMenu={true}
    >
      <BuilderContent client={client} {...data} />
    </Page>
  );
}
