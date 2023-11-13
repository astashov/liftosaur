import { h, JSX } from "preact";
import { MockAudioInterface } from "../../lib/audioInterface";
import { IAccount } from "../../models/account";
import { IEnv } from "../../models/state";
import { IStorage } from "../../types";
import { AsyncQueue } from "../../utils/asyncQueue";
import { ProgramContentList } from "../program/programContentList";
import { Service } from "../../api/service";

export interface IProgramsListContentProps {
  account: IAccount;
  storage: IStorage;
  isMobile: boolean;
  client: Window["fetch"];
}

export function ProgramsListContent(props: IProgramsListContentProps): JSX.Element {
  const queue = new AsyncQueue();
  const audio = new MockAudioInterface();
  const service = new Service(props.client);
  const env: IEnv = { queue, audio, service };
  return <ProgramContentList isMobile={props.isMobile} account={props.account} storage={props.storage} env={env} />;
}
