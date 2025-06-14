import { getHandler, getLftStatsLambda, getLftStatsLambdaDev } from "./index";
import { getStreamingHandler } from "./streamingHandler";
import fetch from "node-fetch";
import { LogUtil } from "./utils/log";
import { buildDi } from "./utils/di";

const log = new LogUtil();
const di = buildDi(log, fetch);
export const handler = getHandler(di);

export const LftStatsLambdaDev = getLftStatsLambdaDev(di);
export const LftStatsLambda = getLftStatsLambda(di);

// Lambda Function URL handler for streaming
export const streamingHandler = getStreamingHandler(di);
