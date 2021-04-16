import { IProgram } from "../../src/types";
import { DynamoDB } from "aws-sdk";
import { Utils } from "../utils";

const tableNames = {
  dev: {
    programs: "lftProgramsDev",
  },
  prod: {
    programs: "lftPrograms",
  },
} as const;

interface IProgramPayload {
  program: IProgram;
  id: string;
  ts: number;
  version: number;
}

export namespace ProgramDao {
  export async function getAll(): Promise<IProgramPayload[]> {
    const dynamo = new DynamoDB.DocumentClient();
    const env = Utils.getEnv();
    const result = await dynamo.scan({ TableName: tableNames[env].programs }).promise();
    return (result.Items || []) as IProgramPayload[];
  }

  export async function save(program: IProgram, timestamp?: number): Promise<void> {
    const dynamo = new DynamoDB.DocumentClient();
    const env = Utils.getEnv();

    await dynamo
      .update({
        TableName: tableNames[env].programs,
        Key: { id: program.id },
        UpdateExpression: "SET ts = :ts, program = :program",
        ExpressionAttributeValues: {
          ":ts": timestamp || Date.now(),
          ":program": program,
        },
      })
      .promise();
  }

  export async function add(programPayload: IProgramPayload): Promise<void> {
    const dynamo = new DynamoDB.DocumentClient();
    const env = Utils.getEnv();
    console.log(programPayload);
    programPayload.id = programPayload.program.id;

    await dynamo
      .put({
        TableName: tableNames[env].programs,
        Item: programPayload,
      })
      .promise();
  }
}
