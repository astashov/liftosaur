import { ILogUtil } from "../../lambda/utils/log";
import { IGoogleServiceAccountPubsub, ISecretsUtil } from "../../lambda/utils/secrets";

export class MockSecretsUtil implements ISecretsUtil {
  constructor(public readonly log: ILogUtil) {}

  public async getCookieSecret(): Promise<string> {
    return "cookieSecret";
  }
  public async getCryptoKey(): Promise<string> {
    return "";
  }
  public async getApiKey(): Promise<string> {
    return "";
  }
  public async getWebpushrKey(): Promise<string> {
    return "";
  }
  public async getWebpushrAuthToken(): Promise<string> {
    return "";
  }
  public async getAppleAppSharedSecret(): Promise<string> {
    return "";
  }
  public async getApplePrivateKey(): Promise<string> {
    return "";
  }
  public async getAppleKeyId(): Promise<string> {
    return "";
  }
  public async getAppleIssuerId(): Promise<string> {
    return "";
  }
  public async getApplePromotionalOfferKeyId(): Promise<string> {
    return "";
  }
  public async getApplePromotionalOfferPrivateKey(): Promise<string> {
    return "";
  }
  public async getGoogleServiceAccountPubsub(): Promise<IGoogleServiceAccountPubsub> {
    return {
      type: "",
      project_id: "",
      private_key_id: "",
      private_key: "",
      client_email: "",
      client_id: "",
      auth_uri: "",
      token_uri: "",
      auth_provider_x509_cert_url: "",
      client_x509_cert_url: "",
    };
  }
  public async getOpenAiKey(): Promise<string> {
    return "";
  }
  public async getAnthropicKey(): Promise<string> {
    return "";
  }
}
