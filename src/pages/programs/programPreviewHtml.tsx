import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { ProgramPreviewPage } from "./programPreviewPage";

interface IProps {
  client: Window["fetch"];
}

export function ProgramPreviewHtml(props: IProps): JSX.Element {
  return (
    <Page
      css={["programpreview"]}
      js={["programpreview"]}
      title="Program Previewer | Liftosaur"
      canonical="https://www.liftosaur.com/program-preview"
      maxWidth={10000}
      maxBodyWidth={10000}
      data={{}}
      client={props.client}
    >
      <ProgramPreviewPage />
    </Page>
  );
}
