import { Lambda } from "aws-sdk";
import { LogUtil } from "./log";

export class LambdaUtil {
  private _lambda?: Lambda;

  constructor(private readonly log: LogUtil) {}

  private get lambda(): Lambda {
    if (this._lambda == null) {
      this._lambda = new Lambda();
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
      const result = await this.lambda
        .invoke({
          FunctionName: args.name,
          InvocationType: args.invocationType,
          Payload: JSON.stringify(args.payload),
        })
        .promise();
      this.log.log(`Lambda invocation: ${args.name} / ${args.invocationType} - ${Date.now() - startTime}ms`);
      console.log(result);
    } catch (e) {
      this.log.log(`FAILED Lambda invocation: ${args.name} / ${args.invocationType} - ${Date.now() - startTime}ms`);
      throw e;
    }
  }
}
