import {
  SNSClient,
  CreatePlatformEndpointCommand,
  SetEndpointAttributesCommand,
  PublishCommand,
  DeleteEndpointCommand,
} from "@aws-sdk/client-sns";
import { ILogUtil } from "./log";

export type ISnsEndpointOutcome = "ok" | "disabled" | "gone";

export interface ISnsUtil {
  createPlatformEndpoint(args: { platformApplicationArn: string; token: string }): Promise<string>;
  setEndpoint(args: { endpointArn: string; token: string }): Promise<"ok" | "gone">;
  publish(args: {
    endpointArn: string;
    message: string;
    attributes: Record<string, string>;
  }): Promise<ISnsEndpointOutcome>;
  deleteEndpoint(endpointArn: string): Promise<void>;
}

function isSnsError(e: unknown, name: string): boolean {
  return e instanceof Error && e.name === name;
}

export class SnsUtil implements ISnsUtil {
  private _client?: SNSClient;

  constructor(private readonly log: ILogUtil) {}

  private get client(): SNSClient {
    if (this._client == null) {
      this._client = new SNSClient({});
    }
    return this._client;
  }

  public async createPlatformEndpoint(args: { platformApplicationArn: string; token: string }): Promise<string> {
    const startTime = Date.now();
    const result = await this.client.send(
      new CreatePlatformEndpointCommand({ PlatformApplicationArn: args.platformApplicationArn, Token: args.token })
    );
    this.log.log(`SNS create endpoint: ${result.EndpointArn} - ${Date.now() - startTime}ms`);
    return result.EndpointArn!;
  }

  public async setEndpoint(args: { endpointArn: string; token: string }): Promise<"ok" | "gone"> {
    const startTime = Date.now();
    try {
      await this.client.send(
        new SetEndpointAttributesCommand({
          EndpointArn: args.endpointArn,
          Attributes: { Token: args.token, Enabled: "true" },
        })
      );
    } catch (e) {
      if (isSnsError(e, "NotFoundException")) {
        this.log.log(`SNS set endpoint: gone ${args.endpointArn}`);
        return "gone";
      }
      throw e;
    }
    this.log.log(`SNS set endpoint: ${args.endpointArn} - ${Date.now() - startTime}ms`);
    return "ok";
  }

  public async publish(args: {
    endpointArn: string;
    message: string;
    attributes: Record<string, string>;
  }): Promise<ISnsEndpointOutcome> {
    const startTime = Date.now();
    const messageAttributes: Record<string, { DataType: "String"; StringValue: string }> = {};
    for (const key of Object.keys(args.attributes)) {
      messageAttributes[key] = { DataType: "String", StringValue: args.attributes[key] };
    }
    try {
      await this.client.send(
        new PublishCommand({
          TargetArn: args.endpointArn,
          Message: args.message,
          MessageStructure: "json",
          MessageAttributes: messageAttributes,
        })
      );
    } catch (e) {
      if (isSnsError(e, "EndpointDisabledException")) {
        this.log.log(`SNS publish: disabled ${args.endpointArn}`);
        return "disabled";
      }
      if (isSnsError(e, "NotFoundException")) {
        this.log.log(`SNS publish: gone ${args.endpointArn}`);
        return "gone";
      }
      throw e;
    }
    this.log.log(`SNS publish: ${args.endpointArn} - ${Date.now() - startTime}ms`);
    return "ok";
  }

  public async deleteEndpoint(endpointArn: string): Promise<void> {
    try {
      await this.client.send(new DeleteEndpointCommand({ EndpointArn: endpointArn }));
    } catch (e) {
      if (isSnsError(e, "NotFoundException")) {
        return;
      }
      throw e;
    }
    this.log.log(`SNS delete endpoint: ${endpointArn}`);
  }
}
