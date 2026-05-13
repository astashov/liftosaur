import "mocha";
import { expect } from "chai";
import * as crypto from "crypto";
import { ManifestSigner } from "../../lambda/updates/manifestSigner";
import { ISecretsUtil } from "../../lambda/utils/secrets";

function buildSecretsStub(privateKey: string): ISecretsUtil {
  const noop = async (): Promise<string> => "";
  return {
    getCookieSecret: noop,
    getCryptoKey: noop,
    getApiKey: noop,
    getWebpushrKey: noop,
    getWebpushrAuthToken: noop,
    getAppleAppSharedSecret: noop,
    getApplePrivateKey: noop,
    getAppleKeyId: noop,
    getAppleIssuerId: noop,
    getGoogleServiceAccountPubsub: async () => ({}) as never,
    getOpenAiKey: noop,
    getAnthropicKey: noop,
    getApplePromotionalOfferKeyId: noop,
    getApplePromotionalOfferPrivateKey: noop,
    getUpdatesPrivateKey: async () => privateKey,
  };
}

function parseSigHeader(header: string): { sig: string; keyid: string; alg: string } {
  const parts: Record<string, string> = {};
  for (const token of header.split(",").map((s) => s.trim())) {
    const m = token.match(/^([^=]+)="(.*)"$/);
    if (m) parts[m[1]] = m[2];
  }
  return { sig: parts.sig, keyid: parts.keyid, alg: parts.alg };
}

describe("ManifestSigner", () => {
  it("returns undefined when no signing key is configured", async () => {
    const signer = new ManifestSigner(buildSecretsStub(""));
    expect(await signer.sign("anything")).to.equal(undefined);
  });

  it("produces a signature that verifies with the matching public key", async () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pemPrivate = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const pemPublic = publicKey.export({ type: "spki", format: "pem" }).toString();
    const signer = new ManifestSigner(buildSecretsStub(pemPrivate));
    const body = JSON.stringify({ id: "u1", launchAsset: { url: "https://example.com/b.js" } });
    const header = await signer.sign(body);
    expect(header).to.match(/^sig="[A-Za-z0-9+/=]+", keyid="main", alg="rsa-v1_5-sha256"$/);
    const { sig } = parseSigHeader(header!);
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(body);
    verifier.end();
    expect(verifier.verify(pemPublic, Buffer.from(sig, "base64"))).to.equal(true);
  });

  it("fails verification when the body is tampered", async () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pemPrivate = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const pemPublic = publicKey.export({ type: "spki", format: "pem" }).toString();
    const signer = new ManifestSigner(buildSecretsStub(pemPrivate));
    const header = await signer.sign("original");
    const { sig } = parseSigHeader(header!);
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update("tampered");
    verifier.end();
    expect(verifier.verify(pemPublic, Buffer.from(sig, "base64"))).to.equal(false);
  });
});
