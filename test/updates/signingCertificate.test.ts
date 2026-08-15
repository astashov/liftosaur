import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { X509Certificate } from "crypto";

// Pinned so a mistyped or half-rotated copy fails here rather than silently killing OTA on one
// platform: a wrong certificate makes signature verification throw, the update is skipped, and
// the app just keeps running its embedded bundle without surfacing anything to the user.
const EXPECTED_FINGERPRINT =
  "06:33:F1:C8:B7:DF:92:B5:11:5E:BB:DC:7D:13:A9:40:4A:A0:97:39:53:D6:07:93:C5:D9:19:82:FA:A1:EB:9E";

// Settings.swift is CRLF; the Swift side strips \r and \n before base64-decoding, so compare
// on normalized newlines rather than raw bytes.
function readRepoFile(relative: string): string {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relative), "utf8").replace(/\r\n/g, "\n");
}

function iosCertificate(): string {
  const contents = readRepoFile("ios/Shared/Settings.swift");
  const match = contents.match(/let lftUpdatesSigningCertificate = """\n([\s\S]*?)\n"""/);
  expect(match, "lftUpdatesSigningCertificate not found in ios/Shared/Settings.swift").to.not.equal(null);
  return match![1];
}

function androidCertificate(): string {
  const contents = readRepoFile("android/app/src/main/res/values/strings.xml");
  const match = contents.match(/<string name="lft_updates_signing_certificate">([\s\S]*?)<\/string>/);
  expect(match, "lft_updates_signing_certificate not found in strings.xml").to.not.equal(null);
  return match![1].replace(/\\n/g, "\n").trim();
}

describe("Updates signing certificate", () => {
  it("iOS copy matches the pinned certificate", () => {
    const cert = new X509Certificate(iosCertificate());
    expect(cert.fingerprint256).to.equal(EXPECTED_FINGERPRINT);
  });

  it("Android copy matches the pinned certificate", () => {
    const cert = new X509Certificate(androidCertificate());
    expect(cert.fingerprint256).to.equal(EXPECTED_FINGERPRINT);
  });

  it("iOS and Android carry the exact same certificate", () => {
    expect(iosCertificate().trim()).to.equal(androidCertificate().trim());
  });

  it("certificate has not expired", () => {
    const cert = new X509Certificate(iosCertificate());
    expect(new Date(cert.validTo).getTime()).to.be.greaterThan(Date.now());
  });
});
