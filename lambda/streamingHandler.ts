import { Context } from "aws-lambda";
import { LlmUtil } from "./utils/llms/llm";
import { IDI } from "./utils/di";

// Lambda Function URL event structure
interface LambdaFunctionURLEvent {
  version: string;
  routeKey: string;
  rawPath: string;
  rawQueryString: string;
  headers: { [key: string]: string };
  requestContext: {
    accountId: string;
    apiId: string;
    domainName: string;
    domainPrefix: string;
    http: {
      method: string;
      path: string;
      protocol: string;
      sourceIp: string;
      userAgent: string;
    };
    requestId: string;
    time: string;
    timeEpoch: number;
  };
  body?: string;
  isBase64Encoded: boolean;
}

// Import the streamifyResponse wrapper
declare const awslambda: any;

export function getStreamingHandler(di: IDI) {
  const handler = async (
    event: LambdaFunctionURLEvent,
    responseStream: NodeJS.WritableStream,
    context: Context
  ): Promise<void> => {
    // Get origin for CORS
    const origin = event.headers?.origin || event.headers?.Origin || "*";
    const allowedOrigins = [
      "https://www.liftosaur.com",
      "https://stage.liftosaur.com",
      "https://local.liftosaur.com:8080",
      "http://localhost:8080",
    ];
    const corsOrigin = allowedOrigins.includes(origin) ? origin : "https://www.liftosaur.com";

    // Create response metadata
    const responseMetadata = {
      statusCode: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };

    // Handle OPTIONS request for CORS preflight
    if (event.requestContext.http.method === "OPTIONS") {
      responseStream.write(JSON.stringify(responseMetadata));
      responseStream.end();
      return;
    }

    // Check if the request is for the correct path
    const path = event.rawPath || event.requestContext.http.path;
    if (path !== "/api/ai/convert-stream") {
      responseMetadata.statusCode = 404;
      responseStream.write(JSON.stringify(responseMetadata));
      responseStream.write(`data: ${JSON.stringify({ type: "error", data: "Not found" })}\n\n`);
      responseStream.write("data: [DONE]\n\n");
      responseStream.end();
      return;
    }

    // Parse the request body
    let input: string;
    try {
      const body = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString() : event.body || "";
      const parsed = JSON.parse(body);
      input = parsed.input;

      if (!input || typeof input !== "string") {
        throw new Error("Invalid input");
      }
    } catch (error) {
      responseMetadata.statusCode = 400;
      responseStream.write(JSON.stringify(responseMetadata));
      responseStream.write(`data: ${JSON.stringify({ type: "error", data: "Invalid request body" })}\n\n`);
      responseStream.write("data: [DONE]\n\n");
      responseStream.end();
      return;
    }

    // Write response metadata first
    responseStream.write(JSON.stringify(responseMetadata));

    try {
      const llm = new LlmUtil(di.secrets, di.log, di.fetch);

      // Stream from LLM and write to response stream
      for await (const event of llm.convertProgramToLiftoscriptStream(input)) {
        const sseData = `data: ${JSON.stringify(event)}\n\n`;
        responseStream.write(sseData);
      }

      responseStream.write("data: [DONE]\n\n");
      responseStream.end();
    } catch (error) {
      di.log.log("Error in streaming handler:", error);
      const errorMessage = error instanceof Error ? error.message : "Conversion failed";
      responseStream.write(`data: ${JSON.stringify({ type: "error", data: errorMessage })}\n\n`);
      responseStream.write("data: [DONE]\n\n");
      responseStream.end();
    }
  };

  // Wrap the handler with streamifyResponse
  return awslambda.streamifyResponse(handler);
}
