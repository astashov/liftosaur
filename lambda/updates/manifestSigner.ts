import * as crypto from "crypto";
import { ISecretsUtil } from "../utils/secrets";

export interface IManifestSigner {
  sign(body: string): Promise<string | undefined>;
}

export class ManifestSigner implements IManifestSigner {
  constructor(private readonly secrets: ISecretsUtil) {}

  public async sign(body: string): Promise<string | undefined> {
    const key = await this.secrets.getUpdatesPrivateKey();
    if (!key) {
      return undefined;
    }
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(body);
    signer.end();
    const signature = signer.sign(key).toString("base64");
    return `sig="${signature}", keyid="main", alg="rsa-v1_5-sha256"`;
  }
}
