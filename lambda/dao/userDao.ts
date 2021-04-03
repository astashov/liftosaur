import { DynamoDB } from "aws-sdk";
import { IStorage } from "../../src/types";
import { Settings } from "../../src/models/settings";
import { IEnv } from "../index";

const tableNames = {
  dev: {
    users: "lftUsersDev",
    usersGoogleId: "lftUsersGoogleIdDev",
  },
  prod: {
    users: "lftUsers",
    usersGoogleId: "lftUsersGoogleId",
  },
} as const;

export interface IUserDao {
  id: string;
  email: string;
  createdAt: number;
  googleId: string;
  storage: Omit<IStorage, "history" | "stats" | "programs">;
}

export class UserDao {
  public static async getByGoogleId(env: "dev" | "prod", googleId: string): Promise<IUserDao | undefined> {
    const dynamo = new DynamoDB.DocumentClient();

    const result = await dynamo
      .query({
        TableName: tableNames[env].users,
        IndexName: tableNames[env].usersGoogleId,
        KeyConditionExpression: "#googleId = :googleId",
        ExpressionAttributeNames: {
          "#googleId": "googleId",
        },
        ExpressionAttributeValues: {
          ":googleId": googleId,
        },
      })
      .promise();

    const items = result.Items;
    return items?.[0] as IUserDao | undefined;
  }

  public static build(id: string, googleId: string, email: string): IUserDao {
    return {
      id,
      email,
      googleId,
      createdAt: Date.now(),
      storage: {
        id: 1,
        currentProgramId: undefined,
        version: "0",
        helps: [],
        tempUserId: "",
        settings: Settings.build(),
      },
    };
  }

  public static async store(env: IEnv, user: IUserDao): Promise<void> {
    const dynamo = new DynamoDB.DocumentClient();

    await dynamo
      .put({
        TableName: tableNames[env].users,
        Item: user,
      })
      .promise();
  }
}
