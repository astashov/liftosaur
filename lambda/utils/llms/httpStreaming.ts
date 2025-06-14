import * as https from "https";
import { IncomingMessage } from "http";

export interface IStreamingRequest {
  hostname: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

export class HttpStreaming {
  static async *streamRequest(
    request: IStreamingRequest
  ): AsyncGenerator<string, void, unknown> {
    const response = await this.makeRequest(request);

    if (response.statusCode !== 200) {
      const errorBody = await this.readFullResponse(response);
      throw new Error(`HTTP ${response.statusCode}: ${errorBody}`);
    }

    // Stream the response
    let buffer = "";
    for await (const chunk of response) {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          yield line;
        }
      }
    }

    // Yield any remaining buffer content
    if (buffer.trim()) {
      yield buffer;
    }
  }

  private static makeRequest(request: IStreamingRequest): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: request.hostname,
          path: request.path,
          method: request.method,
          headers: {
            ...request.headers,
            "Content-Length": Buffer.byteLength(request.body),
          },
        },
        (res) => {
          resolve(res);
        }
      );

      req.on("error", reject);
      req.write(request.body);
      req.end();
    });
  }

  private static readFullResponse(response: IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
      let data = "";
      response.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      response.on("end", () => resolve(data));
    });
  }
}