import React, { JSX } from "react";
import { Page } from "../../components/page";
import { IAccount } from "../../models/account";
import { IStorage } from "../../types";
import { ProgramsListContent } from "./programsListContent";

interface IProps {
  account: IAccount;
  storage: IStorage;
  isMobile: boolean;
  client: Window["fetch"];
}

export function ProgramsListHtml(props: IProps): JSX.Element {
  const { client, ...data } = props;
  const title = "Your Programs List | Liftosaur";
  const url = "https://www.liftosaur.com/user/programs";

  return (
    <Page
      css={["programsList"]}
      js={["programsList"]}
      maxWidth={1200}
      title={title}
      description="All the weightlifting programs from your account"
      canonical={url}
      ogUrl={url}
      data={data}
      account={props.account}
      client={client}
      url="/user/programs"
    >
      <ProgramsListContent client={client} {...data} />
    </Page>
  );
}
