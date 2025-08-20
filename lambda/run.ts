import { getHandler, getLftStatsLambda, getLftStatsLambdaDev } from "./index";
import { getStreamingHandler } from "./streamingHandler";
import fetch from "node-fetch";
import { LogUtil } from "./utils/log";
import { buildDi } from "./utils/di";

const diBuilder = () => buildDi(new LogUtil(), fetch);

export const handler = getHandler(diBuilder);

export const LftStatsLambdaDev = getLftStatsLambdaDev(diBuilder);
export const LftStatsLambda = getLftStatsLambda(diBuilder);

// Lambda Function URL handler for streaming
export const streamingHandler = getStreamingHandler(diBuilder);
