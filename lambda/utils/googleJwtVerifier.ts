import JWT from "jsonwebtoken";
import { createPublicKey } from "crypto";
import { ILogUtil } from "./log";

interface GoogleJWTHeader {
  alg: string;
  kid: string;
  typ: string;
}

interface GoogleJWTPayload {
  aud: string;
  email: string;
  email_verified: boolean;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
}

export class GoogleJWTVerifier {
  constructor(private readonly log: ILogUtil) {}

  public async verifyJWT(authorizationHeader: string): Promise<GoogleJWTPayload | null> {
    try {
      const token = authorizationHeader.replace("Bearer ", "");

      const decoded = JWT.decode(token, { complete: true });
      if (!decoded || typeof decoded === "string") {
        this.log.log("Failed to decode Google JWT");
        return null;
      }

      const header = decoded.header as GoogleJWTHeader;

      if (!header || !header.kid || header.alg !== "RS256") {
        this.log.log("Invalid Google JWT header or unsupported algorithm");
        return null;
      }

      const jwk = await this.getGooglePublicKeyJWK(header.kid);
      if (!jwk) {
        this.log.log(`Failed to get Google public key for kid: ${header.kid}`);
        return null;
      }

      const publicKeyObject = createPublicKey({
        key: jwk,
        format: "jwk",
      });

      const publicKeyPem = publicKeyObject.export({
        type: "spki",
        format: "pem",
      }) as string;

      const verified = JWT.verify(token, publicKeyPem, {
        algorithms: ["RS256"],
        issuer: "https://accounts.google.com",
      }) as GoogleJWTPayload;

      if (!verified.email_verified) {
        this.log.log("Google JWT email not verified");
        return null;
      }

      const now = Math.floor(Date.now() / 1000);
      if (verified.exp < now) {
        this.log.log("Google JWT token expired");
        return null;
      }

      if (verified.iat < now - 3600) {
        this.log.log("Google JWT token too old (> 1 hour)");
        return null;
      }

      return verified;
    } catch (error) {
      this.log.log("Google JWT verification failed:", error);
      return null;
    }
  }

  private async getGooglePublicKeyJWK(kid: string): Promise<any | null> {
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
      if (!response.ok) {
        this.log.log("Failed to fetch Google public keys");
        return null;
      }

      const data = await response.json();
      const key = data.keys?.find((k: any) => k.kid === kid);

      if (!key) {
        this.log.log(`Google public key not found for kid: ${kid}`);
        return null;
      }

      return key;
    } catch (error) {
      this.log.log("Error fetching Google public keys:", error);
      return null;
    }
  }
}
