import "source-map-support/register";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import { Router } from "./router";

const tableNames = {
  dev: {
    hits: "liftosaurHitsDev",
  },
  prod: {
    hits: "liftosaurHits",
  },
} as const;

async function blahHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log("HERE PLEASE");
  console.log(`Table name: ${process.env.HITS_TABLE_NAME}`);
  console.log(event.path);
  console.log(event.httpMethod);

  const dynamo = new DynamoDB();

  console.log("About to make a call");
  const env = process.env.IS_DEV ? "dev" : "prod";

  await dynamo
    .updateItem({
      TableName: tableNames[env].hits,
      Key: { path: { S: event.path } },
      UpdateExpression: "ADD hits :incr",
      ExpressionAttributeValues: { ":incr": { N: "1" } },
    })
    .promise();

  console.log("Made a call");

  const response: APIGatewayProxyResult = {
    statusCode: 200,
    body: JSON.stringify({
      message: `hello world!`,
    }),
  };

  return response;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const r = new Router();
  r.get(".*/api/blah", blahHandler);
  const resp = await r.route(event);
  return resp;
};
