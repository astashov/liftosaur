import { SESClient, SendEmailCommand, SendEmailCommandOutput } from "@aws-sdk/client-ses";
import { ILogUtil } from "./log";

export interface ISesUtil {
  sendEmail(args: {
    destination: string;
    source: string;
    subject: string;
    body: string;
  }): Promise<SendEmailCommandOutput | undefined>;
}

export class SesUtil implements ISesUtil {
  private _ses?: SESClient;

  constructor(public readonly log: ILogUtil) {}

  private get ses(): SESClient {
    if (this._ses == null) {
      this._ses = new SESClient({});
    }
    return this._ses;
  }

  public async sendEmail(args: {
    destination: string;
    source: string;
    subject: string;
    body: string;
  }): Promise<SendEmailCommandOutput | undefined> {
    const startTime = Date.now();
    const result = await this.ses.send(
      new SendEmailCommand({
        Destination: { ToAddresses: [args.destination] },
        Source: args.source,
        Message: { Subject: { Data: args.subject }, Body: { Text: { Data: args.body } } },
      })
    );
    this.log.log(`SES email '${args.subject}' to '${args.destination}' got sent - ${Date.now() - startTime}ms`);
    return result;
  }
}
