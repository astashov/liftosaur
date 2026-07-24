import * as crypto from "crypto";
import { IDI } from "./di";
import { IApplePromotionalOffer } from "../../src/models/state";

export class ApplePromotionalOfferSigner {
  constructor(private readonly di: IDI) {}

  public async generateSignature(
    offerId: string,
    applicationUsername: string,
    productId: string
  ): Promise<IApplePromotionalOffer> {
    const nonce = crypto.randomUUID();
    const timestamp = Date.now();

    const appBundleId = "com.liftosaur.www";
    const keyIdentifier = await this.di.secrets.getApplePromotionalOfferKeyId();
    const privateKey = await this.di.secrets.getApplePromotionalOfferPrivateKey();

    const separator = "\u2063"; // Unicode invisible separator
    const payload = [
      appBundleId,
      keyIdentifier,
      productId,
      offerId,
      applicationUsername.toLowerCase(),
      nonce,
      timestamp.toString(),
    ].join(separator);

    const sign = crypto.createSign("sha256");
    sign.update(payload, "utf8");
    sign.end();
    const signature = sign.sign(privateKey, "base64");

    return {
      offerId,
      signature,
      nonce,
      timestamp,
    };
  }
}
