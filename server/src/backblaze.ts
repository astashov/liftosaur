declare let backblazeApplicationKeyId: string;
declare let backblazeApplicationKey: string;

export class Backblaze {
  public async upload(filename: string, data: unknown): Promise<boolean> {
    const encodedKey = `Basic ${Buffer.from(`${backblazeApplicationKeyId}:${backblazeApplicationKey}`).toString(
      "base64"
    )}`;
    const authResult = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
      headers: { Authorization: encodedKey },
    }).then((r) => r.json());
    const uploadUrlResult = await fetch(`${authResult.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: "POST",
      body: JSON.stringify({ bucketId: "d4bb83d576b2768177290c11" }),
      headers: { Authorization: authResult.authorizationToken },
    }).then((r) => r.json());
    const body = JSON.stringify(data);
    const uploadResult = await fetch(uploadUrlResult.uploadUrl, {
      method: "POST",
      body: body,
      headers: {
        Authorization: uploadUrlResult.authorizationToken,
        "X-Bz-File-Name": filename,
        "Content-Type": "application/json",
        "X-Bz-Content-Sha1": await this.digestMessage(body),
      },
    });
    return uploadResult.status === 200;
  }

  private async digestMessage(message: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-1", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
  }
}
