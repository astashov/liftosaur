import "mocha";
import { expect } from "chai";
import { PasswordHash_hash, PasswordHash_verify } from "../lambda/utils/passwordHash";

describe("PasswordHash", () => {
  it("verifies a correct password", async () => {
    const hash = await PasswordHash_hash("correct horse battery staple");
    expect(await PasswordHash_verify("correct horse battery staple", hash)).to.equal(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await PasswordHash_hash("correct horse battery staple");
    expect(await PasswordHash_verify("Correct horse battery staple", hash)).to.equal(false);
    expect(await PasswordHash_verify("", hash)).to.equal(false);
  });

  it("produces unique salts per hash", async () => {
    const hash1 = await PasswordHash_hash("same password");
    const hash2 = await PasswordHash_hash("same password");
    expect(hash1).to.not.equal(hash2);
    expect(await PasswordHash_verify("same password", hash1)).to.equal(true);
    expect(await PasswordHash_verify("same password", hash2)).to.equal(true);
  });

  it("stores the parameters in the hash string", async () => {
    const hash = await PasswordHash_hash("pw");
    const parts = hash.split("$");
    expect(parts[0]).to.equal("scrypt");
    expect(parts).to.have.length(6);
  });

  it("rejects malformed stored values", async () => {
    expect(await PasswordHash_verify("pw", "")).to.equal(false);
    expect(await PasswordHash_verify("pw", "plaintext")).to.equal(false);
    expect(await PasswordHash_verify("pw", "bcrypt$10$abc$def$ghi$jkl")).to.equal(false);
    expect(await PasswordHash_verify("pw", "scrypt$x$y$z$notbase64$notbase64")).to.equal(false);
  });

  it("rejects a tampered hash", async () => {
    const hash = await PasswordHash_hash("pw12345678");
    const tampered = hash.slice(0, -4) + (hash.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(await PasswordHash_verify("pw12345678", tampered)).to.equal(false);
  });
});
