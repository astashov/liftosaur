import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { IEither } from "../../src/utils/types";
import { LftS3Buckets } from "../dao/buckets";
import { Utils_getEnv } from "../utils";
import { IDI } from "./di";
import { ResponseUtils_json } from "./response";

export async function ImageCacher_cache(
  di: IDI,
  event: APIGatewayProxyEvent,
  key: string,
  factory: () => Promise<IEither<Buffer | Uint8Array, string>>
): Promise<APIGatewayProxyResult> {
  const env = Utils_getEnv();
  const bucket = `${LftS3Buckets.caches}${env === "dev" ? "dev" : ""}`;
  const headers = {
    "content-type": "image/png",
    "cache-control": "max-age=86400",
  };
  const body = await di.s3.getObject({ bucket, key });
  if (body != null) {
    return {
      statusCode: 200,
      body: `${body.toString("base64")}`,
      headers,
      isBase64Encoded: true,
    };
  }
  const result = await factory();
  if (result.success) {
    const buffer = Buffer.from(result.data);
    await di.s3.putObject({ bucket, key, body: buffer });
    return {
      statusCode: 200,
      body: buffer.toString("base64"),
      headers,
      isBase64Encoded: true,
    };
  } else {
    return ResponseUtils_json(400, event, { error: result.error });
  }
}
