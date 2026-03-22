import domains from "../localdomain";

export const localdomain: string = domains.main;
export const localapidomain: string = domains.api;
export const localstreamingapidomain: string = domains.streamingapi;
export const localport: number = domains.port || 8080;
export const localapiport: number = domains.apiPort || 3000;
export const localstreamingapiport: number = domains.streamingApiPort || 3001;
