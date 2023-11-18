import { CloudWatchLogs } from "aws-sdk";
import { CollectionUtils } from "../../src/utils/collection";
import { DateUtils } from "../../src/utils/date";
import { LogUtil } from "./log";
import fs from "fs";
import { Utils } from "../utils";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class CloudwatchUtil {
  private _cloudwatch?: CloudWatchLogs;

  constructor(private readonly log: LogUtil) {}

  private get cloudwatch(): CloudWatchLogs {
    if (this._cloudwatch == null) {
      this._cloudwatch = new CloudWatchLogs();
    }
    return this._cloudwatch;
  }

  public async getLogs(date: Date): Promise<void> {
    this.log.log("Fetching logs for", date);
    const env = Utils.getEnv();
    const logGroupsResponse = await this.cloudwatch.describeLogGroups().promise();
    const logGroupName = logGroupsResponse.logGroups?.find((r) =>
      r.logGroupName?.includes(`LftLambda${env === "dev" ? "Dev" : ""}`)
    )?.logGroupName;
    const prefix = DateUtils.formatYYYYMMDD(date, "/");
    let key: string | undefined;
    let logStreams: CloudWatchLogs.LogStream[] = [];
    let lastLogStreams: CloudWatchLogs.LogStream[] = [];
    do {
      const response = await this.cloudwatch
        .describeLogStreams({ logGroupName, logStreamNamePrefix: prefix, nextToken: key })
        .promise();
      lastLogStreams = response.logStreams || [];
      logStreams = logStreams.concat(lastLogStreams);
      key = response.nextToken;
    } while (key && lastLogStreams.length > 0);
    const logStreamGroups = CollectionUtils.inGroupsOf(10, logStreams);
    let allLogEvents: CloudWatchLogs.OutputLogEvent[] = [];
    for (const logStreamGroup of logStreamGroups) {
      const result3 = await Promise.all(
        (logStreamGroup || []).map(async (r) => {
          let eventKey: string | undefined;
          let logEvents: CloudWatchLogs.OutputLogEvent[] = [];
          let lastLogEvents: CloudWatchLogs.OutputLogEvent[] = [];
          do {
            const response = await this.cloudwatch
              .getLogEvents({
                logStreamName: r.logStreamName || "",
                logGroupName,
                nextToken: eventKey,
                startFromHead: true,
              })
              .promise();
            lastLogEvents = response.events || [];
            logEvents = logEvents.concat(lastLogEvents);
            this.log.log("fetching log events page", lastLogEvents.length);
            eventKey = response.nextForwardToken;
          } while (eventKey && lastLogEvents.length > 0);
          await sleep(300);
          return logEvents;
        })
      );
      const nonEmpty = result3.filter((r) => r && r.length > 0).flat();
      allLogEvents = allLogEvents.concat(nonEmpty);
      await sleep(500);
    }

    const processedLogEvents = allLogEvents
      .reduce<string[]>((memo, logEvent) => {
        const strippedMsg = (logEvent.message || "").replace(/^[^\[]*/, "");
        if (strippedMsg) {
          const eventDate = DateUtils.formatHHMMSS(new Date(logEvent.timestamp || 0), true);
          memo.push(`${eventDate} ${strippedMsg.trim()}`);
        }
        return memo;
      }, [])
      .sort();

    const orderedLogs = this.orderLogs(processedLogEvents).join("\n");
    fs.writeFileSync(`logs-${DateUtils.formatYYYYMMDD(date, "-")}.txt`, orderedLogs, { encoding: "utf8" });
  }

  private orderLogs(logs: string[]): string[] {
    const sortedResult = new Map<string, Map<string, string[]>>();
    for (const log of logs) {
      const hhmm = log.substr(0, 5);
      const match = log.match(/\[(\w+)\]/);
      if (match) {
        const key = match[1];
        let hours = sortedResult.get(hhmm);
        if (!hours) {
          hours = new Map<string, string[]>();
          sortedResult.set(hhmm, hours);
        }
        let keys = hours.get(key);
        if (!keys) {
          keys = [];
          hours.set(key, keys);
        }
        keys.push(log);
      }
    }

    const result: string[] = [];
    for (const [_, hours] of sortedResult) {
      for (const [__, keys] of hours) {
        for (const k of keys) {
          result.push(k);
        }
        result.push("");
      }
    }

    return result;
  }
}
