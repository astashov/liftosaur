import React, { JSX } from "react";
import { Page } from "../../components/page";
import { IAccount } from "../../models/account";
import { MathUtils } from "../../utils/math";
import { StringUtils } from "../../utils/string";
import { RepMaxContent } from "./repMaxContent";

interface IProps {
  client: Window["fetch"];
  reps: number | undefined;
  account?: IAccount;
}

export function RepMaxHtml(props: IProps): JSX.Element {
  const { client, account, ...data } = props;
  const repsWord = MathUtils.toWord(data.reps);
  const url = `https://www.liftosaur.com/${repsWord ? `${repsWord}-` : ""}rep-max-calculator`;
  const title = `${repsWord ? `${StringUtils.capitalize(repsWord)} ` : ""}Rep Max Calculator | Liftosaur`;

  return (
    <Page
      css={["repmax"]}
      js={["repmax"]}
      maxWidth={1200}
      title={title}
      canonical={url}
      account={account}
      description={`Calculate your ${repsWord} rep max from known weight and reps. It's often useful as an entry weight for various weightlifting programs.`}
      ogUrl={url}
      data={data}
      client={client}
    >
      <RepMaxContent {...data} />
    </Page>
  );
}
