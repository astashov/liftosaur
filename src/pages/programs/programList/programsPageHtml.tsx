import { h, JSX } from "preact";
import { Page } from "../../../components/page";
import { IAccount } from "../../../models/account";
import { IProgramListItem, ProgramsPageContent } from "../programsPageContent";

interface IProps {
  programs: IProgramListItem[];
  account?: IAccount;
  client: Window["fetch"];
}

export function ProgramsPageHtml(props: IProps): JSX.Element {
  const { client, ...data } = props;
  const title = "Weightlifting Programs | Liftosaur";
  const url = "https://www.liftosaur.com/programs";

  return (
    <Page
      css={["allprograms"]}
      js={["allprograms"]}
      maxWidth={1200}
      title={title}
      canonical={url}
      account={props.account}
      description="Browse built-in and community weightlifting programs. Filter by experience, frequency, duration, and goals."
      ogUrl={url}
      data={data}
      client={client}
      url="/programs"
    >
      <ProgramsPageContent client={client} {...data} />
    </Page>
  );
}
