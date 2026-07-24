import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { ILogUtil } from "./log";

export interface ILambdaUtil {
  invoke<T>(args: { name: string; invocationType: "RequestResponse" | "Event"; payload: T }): Promise<void>;
}

export class LambdaUtil implements ILambdaUtil {
  private _lambda?: LambdaClient;

  constructor(private readonly log: ILogUtil) {}

  private get lambda(): LambdaClient {
    if (this._lambda == null) {
      this._lambda = new LambdaClient({});
    }
    return this._lambda;
  }

  public async invoke<T>(args: {
    name: string;
    invocationType: "RequestResponse" | "Event";
    payload: T;
  }): Promise<void> {
    const startTime = Date.now();
    try {
      const result = await this.lambda.send(
        new InvokeCommand({
          FunctionName: args.name,
          InvocationType: args.invocationType,
          Payload: Buffer.from(JSON.stringify(args.payload)),
        })
      );
      this.log.log(`Lambda invocation: ${args.name} / ${args.invocationType} - ${Date.now() - startTime}ms`);
      console.log(result);
    } catch (e) {
      this.log.log(`FAILED Lambda invocation: ${args.name} / ${args.invocationType} - ${Date.now() - startTime}ms`);
      throw e;
    }
  }
}
