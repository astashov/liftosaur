import { SecretsManager } from "aws-sdk";

import { LogUtil } from "./log";
import { Utils } from "../utils";

interface IGoogleServiceAccountPubsub {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export class SecretsUtil {
  private _secrets?: SecretsManager;
  private readonly _cache: Partial<Record<string, string>> = {};

  constructor(public readonly log: LogUtil) {}

  private get secrets(): SecretsManager {
    if (this._secrets == null) {
      this._secrets = new SecretsManager();
    }
    return this._secrets;
  }

  private async cache(name: string, cb: () => Promise<string>): Promise<string> {
    if (this._cache[name] == null) {
      this._cache[name] = await cb();
    }
    return this._cache[name]!;
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
    return this.cache("cookieSecret", () =>
      this.getSecret({
        dev: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyCookieSecretDev-0eiLCe",
        prod: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyCookieSecret-FwRXge",
      })
    );
  }

  public async getCryptoKey(): Promise<string> {
    return this.cache("cryptoKey", () =>
      this.getSecret({
        dev: "arn:aws:secretsmanager:us-west-2:547433167554:secret:lftCryptoKeyDev-qFcITJ",
        prod: "arn:aws:secretsmanager:us-west-2:547433167554:secret:lftCryptoKey-4Uxrea",
      })
    );
  }

  public async getApiKey(): Promise<string> {
    return this.cache("apiKey", () =>
      this.getSecret({
        dev: "arn:aws:secretsmanager:us-west-2:547433167554:secret:lftKeyApiKeyDev-JyFvUp",
        prod: "arn:aws:secretsmanager:us-west-2:547433167554:secret:lftKeyApiKey-rdTqST",
      })
    );
  }

  public async getWebpushrKey(): Promise<string> {
    return this.cache("webpushrKey", () =>
      this.getSecret({
        dev: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyWebpushrKeyDev-OfWaEI",
        prod: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyWebpushrKey-RrE8Yo",
      })
    );
  }

  public async getWebpushrAuthToken(): Promise<string> {
    return this.cache("webpushrAuthToken", () =>
      this.getSecret({
        dev: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyWebpushrAuthTokenDev-Fa7AH9",
        prod: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyWebpushrAuthToken-dxAKvR",
      })
    );
  }

  public async getAppleAppSharedSecret(): Promise<string> {
    return this.cache("appleAppSharedSecret", () =>
      this.getSecret({
        dev: "arn:aws:secretsmanager:us-west-2:547433167554:secret:lftAppleAppSharedSecret-hDZrTa",
        prod: "arn:aws:secretsmanager:us-west-2:547433167554:secret:lftAppleAppSharedSecret-hDZrTa",
      })
    );
  }

  public async getGoogleServiceAccountPubsub(): Promise<IGoogleServiceAccountPubsub> {
    const json = this.cache("googleServiceAccountPubsub", () =>
      this.getSecret({
        dev: "arn:aws:secretsmanager:us-west-2:547433167554:secret:lftGoogleServiceAccountPubsub-6YyK94",
        prod: "arn:aws:secretsmanager:us-west-2:547433167554:secret:lftGoogleServiceAccountPubsub-6YyK94",
      })
    );
    return json.then((s) => JSON.parse(s));
  }
}
