import * as crypto from "crypto";
import { ISecretsUtil } from "../utils/secrets";

export interface IManifestSigner {
  sign(body: string): Promise<string | undefined>;
}

export class ManifestSigner implements IManifestSigner {
  constructor(private readonly secrets: ISecretsUtil) {}

  public async sign(body: string): Promise<string | undefined> {
    const key = await this.tryGetSigningKey();
    if (!key) {
      return undefined;
    }
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(body);
    signer.end();
    const signature = signer.sign(key).toString("base64");
    return `sig="${signature}", keyid="main", alg="rsa-v1_5-sha256"`;
  }

  private async tryGetSigningKey(): Promise<string | undefined> {
    const secretsWithUpdates = this.secrets as ISecretsUtil & {
      getUpdatesPrivateKey?: () => Promise<string>;
    };
    if (typeof secretsWithUpdates.getUpdatesPrivateKey !== "function") {
      return undefined;
    }
    try {
      return await secretsWithUpdates.getUpdatesPrivateKey();
    } catch {
      return undefined;
    }
  }
}
