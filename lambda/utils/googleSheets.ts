import { ISecretsUtil, IGoogleServiceAccountPubsub } from "./secrets";
import { ILogUtil } from "./log";
import * as crypto from "crypto";

export interface ISheetData {
  content: string;
  type: "spreadsheet";
}

export class GoogleSheetsUtil {
  constructor(
    private readonly secrets: ISecretsUtil,
    private readonly log: ILogUtil,
    private readonly fetch: Window["fetch"]
  ) {}

  public async fetchSheet(url: string): Promise<ISheetData> {
    // Extract sheet ID from URL
    const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);

    if (!sheetIdMatch) {
      throw new Error("Invalid Google Sheets URL");
    }

    const spreadsheetId = sheetIdMatch[1];

    try {
      // Try API approach first - fetch all sheets
      return await this.fetchAllSheetsWithAPI(spreadsheetId);
    } catch (error) {
      this.log.log("Error fetching Google Sheet with API:", error);
      // Fallback to CSV export - just export the first sheet
      return await this.fetchSheetAsCSV(spreadsheetId, "0");
    }
  }

  private async fetchAllSheetsWithAPI(spreadsheetId: string): Promise<ISheetData> {
    // Get Google service account credentials
    const serviceAccount = await this.secrets.getGoogleServiceAccountPubsub();

    // Get access token using service account
    const accessToken = await this.getGoogleAccessToken(serviceAccount);

    // Get spreadsheet metadata to find sheet name
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    console.log("Fetching Google Sheet metadata:", metadataUrl);
    console.log("Using access token:", accessToken);
    const metadataResponse = await this.fetch(metadataUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!metadataResponse.ok) {
      console.error(await metadataResponse.text());
      throw new Error(`Failed to fetch sheet metadata: ${metadataResponse.status}`);
    }

    const metadata = await metadataResponse.json();
    const sheets = metadata.sheets || [];

    let content = "Google Sheets Data with Formulas:\n\n";
    content += `Spreadsheet: ${metadata.properties?.title || "Untitled"}\n`;
    content += `Total Sheets: ${sheets.length}\n\n`;

    // Prepare ranges for batch get - all sheets
    const sheetNames = sheets.map((s: any) => s.properties?.title || "Sheet1");

    // Fetch formulas for all sheets
    const formulasRanges = sheetNames.map((name: string) => encodeURIComponent(name)).join("&ranges=");
    const batchGetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${formulasRanges}&valueRenderOption=FORMULA&dateTimeRenderOption=FORMATTED_STRING`;

    const formulasResponse = await this.fetch(batchGetUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!formulasResponse.ok) {
      throw new Error(`Failed to fetch Google Sheet formulas: ${formulasResponse.status}`);
    }

    const formulasData = await formulasResponse.json();

    // Fetch values for all sheets
    const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${formulasRanges}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;
    const valuesResponse = await this.fetch(valuesUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!valuesResponse.ok) {
      throw new Error(`Failed to fetch Google Sheet values: ${valuesResponse.status}`);
    }

    const valuesData = await valuesResponse.json();

    // Process each sheet
    for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex++) {
      const sheetProperties = sheets[sheetIndex].properties;
      const sheetName = sheetProperties?.title || `Sheet${sheetIndex + 1}`;
      const formulas = formulasData.valueRanges?.[sheetIndex]?.values || [];
      const values = valuesData.valueRanges?.[sheetIndex]?.values || [];

      content += `\n========== SHEET: ${sheetName} ==========\n`;

      // Skip empty sheets
      if (formulas.length === 0 && values.length === 0) {
        content += "(Empty sheet)\n";
        continue;
      }

      // Add column headers if they exist
      if (formulas.length > 0 && formulas[0]) {
        content += "Headers: " + (formulas[0] || []).join(" | ") + "\n\n";
      }

      // Format each row more compactly
      for (let i = 0; i < Math.max(formulas.length, values.length); i++) {
        const formulaRow = formulas[i] || [];
        const valueRow = values[i] || [];

        // Skip completely empty rows
        if (formulaRow.length === 0 && valueRow.length === 0) {
          continue;
        }

        // Collect non-empty cells for this row
        const cells: string[] = [];
        for (let j = 0; j < Math.max(formulaRow.length, valueRow.length); j++) {
          const formula = formulaRow[j] || "";
          const value = valueRow[j] || "";

          // Skip empty cells
          if (!formula && !value) {
            continue;
          }

          const cellRef = `${String.fromCharCode(65 + j)}${i + 1}`;
          if (formula && formula.toString().startsWith("=")) {
            cells.push(`${cellRef}: ${formula} → ${value}`);
          } else if (value !== "") {
            cells.push(`${cellRef}: ${value}`);
          }
        }

        // Only output row if it has content
        if (cells.length > 0) {
          content += `Row ${i + 1}: ${cells.join(" | ")}\n`;
        }
      }
    }

    return { content, type: "spreadsheet" };
  }

  private async fetchSheetAsCSV(spreadsheetId: string, gid: string): Promise<ISheetData> {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    this.log.log("Falling back to CSV export (first sheet only):", csvUrl);

    const response = await this.fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheet as CSV: ${response.status}`);
    }

    const csvContent = await response.text();
    return {
      content: `CSV Data (only first sheet, formulas not available):\n\n${csvContent}`,
      type: "spreadsheet",
    };
  }

  private async getGoogleAccessToken(serviceAccount: IGoogleServiceAccountPubsub): Promise<string> {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600; // 1 hour

    const jwt = await this.createJWT(
      serviceAccount.client_email,
      serviceAccount.private_key,
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      serviceAccount.token_uri,
      iat,
      exp
    );

    const response = await this.fetch(serviceAccount.token_uri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get Google access token: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  private async createJWT(
    clientEmail: string,
    privateKey: string,
    scope: string,
    aud: string,
    iat: number,
    exp: number
  ): Promise<string> {
    try {
      // JWT header
      const header = {
        alg: "RS256",
        typ: "JWT",
      };

      // JWT payload
      const payload = {
        iss: clientEmail,
        scope: scope,
        aud: aud,
        iat: iat,
        exp: exp,
      };

      // Encode header and payload
      const encodedHeader = this.base64urlEncode(JSON.stringify(header));
      const encodedPayload = this.base64urlEncode(JSON.stringify(payload));

      // Create signature
      const signatureInput = `${encodedHeader}.${encodedPayload}`;
      const sign = crypto.createSign("RSA-SHA256");
      sign.update(signatureInput);
      sign.end();

      const signature = sign.sign(privateKey);
      const encodedSignature = this.base64urlEncode(signature);

      // Combine all parts
      return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
    } catch (error) {
      this.log.log("Error creating JWT:", error);
      throw new Error("Failed to create JWT for Google authentication");
    }
  }

  private base64urlEncode(str: string | Buffer): string {
    const base64 = Buffer.isBuffer(str) ? str.toString("base64") : Buffer.from(str).toString("base64");

    return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
}
