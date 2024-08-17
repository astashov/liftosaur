import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { FreeformContent } from "./freeformContent";

interface IProps {
  client: Window["fetch"];
}

export function FreeformHtml(props: IProps): JSX.Element {
  const { client, ...data } = props;

  return (
    <Page
      css={["freeform"]}
      js={["freeform"]}
      maxWidth={1020}
      title="Freeform Program Builder | Liftosaur"
      canonical="https://www.liftosaur.com/freeform"
      ogTitle="Freeform Program Builder | Liftosaur"
      description="The freeform program builder powered by GPT"
      ogUrl="https://www.liftosaur.com/freeform"
      data={data}
      client={client}
    >
      <FreeformContent client={client} {...data} />
    </Page>
  );
}
