import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { IAccount } from "../../models/account";
import { IProgram, ISettings } from "../../types";
import { ProgramDetailsContent } from "./programDetailsContent";

interface IProps {
  program: IProgram;
  fullDescription?: string;
  userAgent?: string;
  client: Window["fetch"];
  account?: IAccount;
  accountSettings?: ISettings;
}

export function ProgramDetailsHtml(props: IProps): JSX.Element {
  const { program } = props;
  const { client, ...data } = props;
  const title = `${program.name} program explained | Liftosaur`;
  const url = `https://www.liftosaur.com/programs/${program.id}`;

  return (
    <Page
      css={["programdetails"]}
      js={["programdetails"]}
      title={title}
      description={`Weightlifting program details - exercises, sets, reps, muscles worked, progressive overload, etc`}
      canonical={url}
      ogUrl={url}
      ogImage={`https://www.liftosaur.com/programimage/${program.id}`}
      maxWidth={1200}
      maxBodyWidth={10000}
      data={data}
      postHead={
        <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.21.0/themes/prism.min.css" rel="stylesheet" />
      }
      client={client}
      account={props.account}
    >
      <ProgramDetailsContent {...props} client={props.client} />
    </Page>
  );
}
