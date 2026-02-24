import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { DateUtils } from "../../src/utils/date";
import { ILogUtil } from "./log";
import fs from "fs";
import { Utils } from "../utils";

export interface ICloudwatchUtil {
  getLogs(date: Date, userid?: string, endpoint?: string): Promise<void>;
}

export class CloudwatchUtil implements ICloudwatchUtil {
  private _cloudwatch?: CloudWatchLogsClient;

  constructor(private readonly log: ILogUtil) {}

  private get cloudwatch(): CloudWatchLogsClient {
    if (this._cloudwatch == null) {
      this._cloudwatch = new CloudWatchLogsClient({});
    }
    return this._cloudwatch;
  }

  public async getLogs(date: Date, userid?: string, endpoint?: string): Promise<void> {
    this.log.log(
      ...[
        "Fetching logs for",
        date,
        ...(userid ? ["for user", userid] : []),
        ...(endpoint ? ["endpoint", endpoint] : []),
      ]
    );
    const env = Utils.getEnv();
    const logGroupsResponse = await this.cloudwatch.send(new DescribeLogGroupsCommand({}));
    const logGroupName = logGroupsResponse.logGroups?.find((r) =>
      r.logGroupName?.includes(`LftLambda${env === "dev" ? "Dev" : ""}`)
    )?.logGroupName;

    if (!logGroupName) {
      this.log.log("Log group not found");
      return;
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const endpointSuffix = endpoint ? `-${endpoint.replace(/\//g, "-")}` : "";
    const outputFile = `logs-${DateUtils.formatYYYYMMDD(date, "-")}${userid ? `-${userid}` : ""}${endpointSuffix}.txt`;
    const tempFile = `${outputFile}.tmp`;
    const writeStream = fs.createWriteStream(tempFile, { encoding: "utf8" });

    let nextToken: string | undefined;
    let totalEvents = 0;
    let pageCount = 0;

    const filterPattern = userid ? `"[${userid}]"` : undefined;

    do {
      const response = await this.cloudwatch.send(
        new FilterLogEventsCommand({
          logGroupName,
          startTime: startOfDay.getTime(),
          endTime: endOfDay.getTime(),
          nextToken,
          filterPattern,
        })
      );

      const events = response.events || [];
      pageCount += 1;

      for (const event of events) {
        const strippedMsg = (event.message || "").replace(/^[^\[]*/, "");
        if (strippedMsg) {
          const eventDate = DateUtils.formatHHMMSS(new Date(event.timestamp || 0), true);
          writeStream.write(`${eventDate} ${strippedMsg.trim()}\x00`);
        }
      }

      totalEvents += events.length;
      this.log.log(`Page ${pageCount}: fetched ${events.length} events (total: ${totalEvents})`);

      nextToken = response.nextToken;
    } while (nextToken);

    writeStream.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    this.log.log(`Fetched ${totalEvents} total events, now sorting and grouping...`);

    this.postProcessLogs(tempFile, outputFile, userid, endpoint);
    fs.unlinkSync(tempFile);

    this.log.log(`Done! Output written to ${outputFile}`);
  }

  private postProcessLogs(inputFile: string, outputFile: string, userid?: string, endpoint?: string): void {
    const lines = fs.readFileSync(inputFile, "utf8").split("\x00").filter(Boolean).sort();

    let matchingRequestIds: Set<string> | undefined;
    if (endpoint) {
      matchingRequestIds = new Set();
      for (const log of lines) {
        if (log.includes(endpoint)) {
          const match = log.match(/\[(\w+)\]/);
          if (match) {
            matchingRequestIds.add(match[1]);
          }
        }
      }
      this.log.log(`Found ${matchingRequestIds.size} requests matching endpoint ${endpoint}`);
    }

    const sortedResult = new Map<string, Map<string, string[]>>();
    for (const log of lines) {
      const hhmm = log.substring(0, 5);
      const match = log.match(/\[(\w+)\](?:\[(\w+)\])?/);
      if (match) {
        const requestId = match[1];
        const loguserid = match[2];
        if (userid && userid !== loguserid) {
          continue;
        }
        if (matchingRequestIds && !matchingRequestIds.has(requestId)) {
          continue;
        }
        let hours = sortedResult.get(hhmm);
        if (!hours) {
          hours = new Map<string, string[]>();
          sortedResult.set(hhmm, hours);
        }
        let keys = hours.get(requestId);
        if (!keys) {
          keys = [];
          hours.set(requestId, keys);
        }
        keys.push(log);
      }
    }

    const output = fs.createWriteStream(outputFile, { encoding: "utf8" });
    for (const [_, hours] of sortedResult) {
      for (const [__, keys] of hours) {
        for (const k of keys) {
          output.write(k + "\n");
        }
        output.write("\n");
      }
    }
    output.end();
  }
}
