import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { IAccount } from "../../models/account";
import { IStorage } from "../../types";
import { HtmlUtils } from "../../utils/html";
import { ProgramsListContent } from "./programsListContent";

interface IProps {
  account: IAccount;
  storage: IStorage;
  isMobile: boolean;
  client: Window["fetch"];
}

export function ProgramsListHtml(props: IProps): JSX.Element {
  const { client, ...data } = props;
  const title = HtmlUtils.escapeHtml("Your Programs List");

  return (
    <Page
      css={["programsList"]}
      js={["programsList"]}
      maxWidth={1200}
      title={title}
      ogTitle="Liftosaur: Your Programs List"
      ogDescription="All the programs from your account"
      ogUrl="https://www.liftosaur.com/user/programs"
      data={data}
      account={props.account}
      client={client}
      url="/user/programs"
    >
      <ProgramsListContent client={client} {...data} />
    </Page>
  );
}
