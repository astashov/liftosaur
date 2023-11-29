import { getHandler, getLftFreeformLambda, getLftFreeformLambdaDev } from "./index";
import fetch from "node-fetch";
import { LogUtil } from "./utils/log";
import { buildDi } from "./utils/di";

const log = new LogUtil();
const di = buildDi(log, fetch);
export const handler = getHandler(di);

export const LftFreeformLambdaDev = getLftFreeformLambdaDev(di);
export const LftFreeformLambda = getLftFreeformLambda(di);
