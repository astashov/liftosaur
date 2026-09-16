import { ILogUtil } from "../../lambda/utils/log";
import { ISnsEndpointOutcome, ISnsUtil } from "../../lambda/utils/sns";

export class MockSnsUtil implements ISnsUtil {
  public created: { platformApplicationArn: string; token: string }[] = [];
  public updated: { endpointArn: string; token: string }[] = [];
  public published: { endpointArn: string; message: string; attributes: Record<string, string> }[] = [];
  public deleted: string[] = [];
  public disabled: Set<string> = new Set();
  public gone: Set<string> = new Set();
  public failing: Set<string> = new Set();
  public deleteFailing: Set<string> = new Set();
  public onPublish?: (endpointArn: string) => Promise<void>;

  constructor(public readonly log: ILogUtil) {}

  public static endpointArn(platformApplicationArn: string, token: string): string {
    return `${platformApplicationArn.replace(":app/", ":endpoint/")}/${token}`;
  }

  public async createPlatformEndpoint(args: { platformApplicationArn: string; token: string }): Promise<string> {
    this.created.push(args);
    return MockSnsUtil.endpointArn(args.platformApplicationArn, args.token);
  }

  public async setEndpoint(args: { endpointArn: string; token: string }): Promise<"ok" | "gone"> {
    this.updated.push(args);
    if (this.gone.has(args.endpointArn)) {
      return "gone";
    }
    this.disabled.delete(args.endpointArn);
    return "ok";
  }

  public async publish(args: {
    endpointArn: string;
    message: string;
    attributes: Record<string, string>;
  }): Promise<ISnsEndpointOutcome> {
    if (this.failing.has(args.endpointArn)) {
      throw new Error(`SNS failure for ${args.endpointArn}`);
    }
    this.published.push(args);
    if (this.onPublish) {
      await this.onPublish(args.endpointArn);
    }
    if (this.disabled.has(args.endpointArn)) {
      return "disabled";
    }
    if (this.gone.has(args.endpointArn)) {
      return "gone";
    }
    return "ok";
  }

  public async deleteEndpoint(endpointArn: string): Promise<void> {
    if (this.deleteFailing.has(endpointArn)) {
      throw new Error(`SNS delete failure for ${endpointArn}`);
    }
    this.deleted.push(endpointArn);
  }
}
