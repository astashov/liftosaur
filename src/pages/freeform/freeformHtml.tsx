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
      title="Freeform Program Builder"
      ogTitle="Liftosaur: Freeform Program jBuilder"
      ogDescription="The freeform program builder powered by GPT"
      ogUrl="https://www.liftosaur.com/freeform"
      data={data}
    >
      <FreeformContent client={client} {...data} />
    </Page>
  );
}
