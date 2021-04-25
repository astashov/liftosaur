import { SecretsManager } from "aws-sdk";

import { LogUtil } from "./log";
import { Utils } from "../utils";

export class SecretsUtil {
  private _secrets?: SecretsManager;

  constructor(public readonly log: LogUtil) {}

  private get secrets(): SecretsManager {
    if (this._secrets == null) {
      this._secrets = new SecretsManager();
    }
    return this._secrets;
  }

  private async getSecret(arns: { dev: string; prod: string }): Promise<string> {
    const startTime = Date.now();
    const key = arns[Utils.getEnv()];
    const result = await this.secrets
      .getSecretValue({ SecretId: key })
      .promise()
      .then((s) => s.SecretString!);
    this.log.log("Secret:", key, ` - ${Date.now() - startTime}ms`);
    return result;
  }

  public async getCookieSecret(): Promise<string> {
    return this.getSecret({
      dev: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyCookieSecretDev-0eiLCe",
      prod: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyCookieSecret-FwRXge",
    });
  }

  public async getApiKey(): Promise<string> {
    return this.getSecret({
      dev: "arn:aws:secretsmanager:us-west-2:547433167554:secret:lftKeyApiKeyDev-JyFvUp",
      prod: "arn:aws:secretsmanager:us-west-2:547433167554:secret:lftKeyApiKey-rdTqST",
    });
  }

  public async getWebpushrKey(): Promise<string> {
    return this.getSecret({
      dev: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyWebpushrKeyDev-OfWaEI",
      prod: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyWebpushrKey-RrE8Yo",
    });
  }

  public async getWebpushrAuthToken(): Promise<string> {
    return this.getSecret({
      dev: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyWebpushrAuthTokenDev-Fa7AH9",
      prod: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyWebpushrAuthToken-dxAKvR",
    });
  }
}
