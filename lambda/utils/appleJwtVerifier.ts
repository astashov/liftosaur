import JWT from "jsonwebtoken";
import { createPublicKey } from "crypto";
import { ILogUtil } from "./log";

interface AppleJWTHeader {
  alg: string;
  x5c: string[]; // Certificate chain
}

export class AppleJWTVerifier {
  constructor(private readonly log: ILogUtil) {}

  /**
   * Verify Apple's JWT signature using the certificate from x5c header
   */
  public verifyJWT(jwtToken: string): any | null {
    try {
      // Decode header to get certificate chain
      const decoded = JWT.decode(jwtToken, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        this.log.log("Failed to decode JWT");
        return null;
      }
      
      const header = decoded.header as AppleJWTHeader;
      
      if (!header || !header.x5c || header.alg !== 'ES256') {
        this.log.log("Invalid JWT header or unsupported algorithm");
        return null;
      }

      // Extract public key from leaf certificate (first in x5c array)
      const leafCertPem = this.derToPem(header.x5c[0]);
      const publicKey = createPublicKey(leafCertPem);

      // Verify JWT signature - convert KeyObject to string for jsonwebtoken
      const payload = JWT.verify(jwtToken, publicKey.export({ type: 'spki', format: 'pem' }), { algorithms: ['ES256'] });
      
      return payload;
    } catch (error) {
      this.log.log("JWT verification error:", error);
      return null;
    }
  }

  /**
   * Convert DER format to PEM format
   */
  private derToPem(der: string): string {
    const base64 = der.replace(/(.{64})/g, '$1\n');
    return `-----BEGIN CERTIFICATE-----\n${base64}\n-----END CERTIFICATE-----`;
  }
}