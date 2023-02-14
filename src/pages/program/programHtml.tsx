import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { IProgram } from "../../types";
import { ProgramContent } from "./programContent";

interface IProps {
  program?: IProgram;
  client: Window["fetch"];
}

export function ProgramHtml(props: IProps): JSX.Element {
  const { client, ...data } = props;

  return (
    <Page
      css={["program"]}
      js={["program"]}
      maxWidth={1020}
      title="Liftosaur: Program Builder"
      ogTitle="Liftosaur: Program Builder"
      ogDescription="The program builder for the Liftosaur app"
      ogUrl="https://www.liftosaur.com/builder"
      data={data}
    >
      <ProgramContent client={client} {...data} />
    </Page>
  );
}
