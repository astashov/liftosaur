import { SecretsManager } from "aws-sdk";

import { ILogUtil } from "./log";
import { Utils } from "../utils";

export interface IGoogleServiceAccountPubsub {
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

interface IAllSecrets {
  apiKey: string;
  cookieSecret: string;
  webpushrKey: string;
  webpushrAuthToken: string;
  cryptoKey: string;
  appleAppSharedSecret: string;
  googleServiceAccountPubsub: IGoogleServiceAccountPubsub;
  openAiKey: string;
  anthropicApiKey: string;
}

export interface ISecretsUtil {
  getCookieSecret(): Promise<string>;
  getCryptoKey(): Promise<string>;
  getApiKey(): Promise<string>;
  getWebpushrKey(): Promise<string>;
  getWebpushrAuthToken(): Promise<string>;
  getAppleAppSharedSecret(): Promise<string>;
  getGoogleServiceAccountPubsub(): Promise<IGoogleServiceAccountPubsub>;
  getOpenAiKey(): Promise<string>;
  getAnthropicKey(): Promise<string>;
}

export class SecretsUtil implements ISecretsUtil {
  private _secrets?: SecretsManager;
  private readonly _cache: Partial<IAllSecrets> = {};

  constructor(public readonly log: ILogUtil) {}

  private get secrets(): SecretsManager {
    if (this._secrets == null) {
      this._secrets = new SecretsManager();
    }
    return this._secrets;
  }

  private async cache<T extends keyof IAllSecrets>(
    name: T,
    cb: () => Promise<IAllSecrets[T]>
  ): Promise<IAllSecrets[T]> {
    if (this._cache[name] == null) {
      this._cache[name] = await cb();
    }
    const value = this._cache[name] as IAllSecrets[T];
    return value;
  }

  private async getSecret<T extends keyof IAllSecrets>(key: T): Promise<IAllSecrets[T]> {
    const startTime = Date.now();
    const arns = {
      dev: "arn:aws:secretsmanager:us-west-2:366191129585:secret:lftAppSecretsDev-RVo7cG",
      prod: "arn:aws:secretsmanager:us-west-2:366191129585:secret:lftAppSecrets-cRCeI1",
    };
    const result = await this.secrets
      .getSecretValue({ SecretId: arns[Utils.getEnv()] })
      .promise()
      .then((s) => s.SecretString!);
    this.log.log("Secret:", key, ` - ${Date.now() - startTime}ms`);
    const json: IAllSecrets = JSON.parse(result);
    return json[key];
  }

  public async getCookieSecret(): Promise<string> {
    return this.cache("cookieSecret", () => this.getSecret("cookieSecret"));
  }

  public async getCryptoKey(): Promise<string> {
    return this.cache("cryptoKey", () => this.getSecret("cryptoKey"));
  }

  public async getApiKey(): Promise<string> {
    return this.cache("apiKey", () => this.getSecret("apiKey"));
  }

  public async getWebpushrKey(): Promise<string> {
    return this.cache("webpushrKey", () => this.getSecret("webpushrKey"));
  }

  public async getWebpushrAuthToken(): Promise<string> {
    return this.cache("webpushrAuthToken", () => this.getSecret("webpushrAuthToken"));
  }

  public async getAppleAppSharedSecret(): Promise<string> {
    return this.cache("appleAppSharedSecret", () => this.getSecret("appleAppSharedSecret"));
  }

  public async getGoogleServiceAccountPubsub(): Promise<IGoogleServiceAccountPubsub> {
    return this.cache("googleServiceAccountPubsub", () => this.getSecret("googleServiceAccountPubsub"));
  }

  public async getOpenAiKey(): Promise<string> {
    return this.cache("openAiKey", () => this.getSecret("openAiKey"));
  }

  public async getAnthropicKey(): Promise<string> {
    return this.cache("anthropicApiKey", () => this.getSecret("anthropicApiKey"));
  }
}
