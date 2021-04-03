import { DynamoDB, AWSError } from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";

const tableNames = {
  dev: {
    googleAuthToken: "lftGoogleAuthKeysDev",
  },
  prod: {
    googleAuthToken: "lftGoogleAuthKeys",
  },
} as const;

export class GoogleAuthTokenDao {
  public static async store(
    env: "dev" | "prod",
    token: string,
    googleId: string
  ): Promise<PromiseResult<DynamoDB.PutItemOutput, AWSError>> {
    const dynamo = new DynamoDB();

    return dynamo
      .putItem({
        TableName: tableNames[env].googleAuthToken,
        Item: {
          token: { S: token },
          googleId: { S: googleId },
        },
      })
      .promise();
  }
}
