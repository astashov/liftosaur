import "mocha";
import { expect } from "chai";
import { BatchWriteCommandInput } from "@aws-sdk/lib-dynamodb";
import { DynamoUtil_sendBatchWriteWithRetry } from "../lambda/utils/dynamo";
import { ILogUtil } from "../lambda/utils/log";

type IItems = NonNullable<BatchWriteCommandInput["RequestItems"]>;

const log: ILogUtil = { id: "test", log: () => undefined, setUser: () => undefined };

function throttle(): Error {
  const error = new Error("Throughput exceeds the current capacity of your table or index.");
  error.name = "ThrottlingException";
  return error;
}

function puts(count: number): IItems {
  return {
    lftHistoryRecords: Array.from({ length: count }, (_, i) => ({ PutRequest: { Item: { id: i } } })),
  };
}

function run(responses: Array<Error | { UnprocessedItems?: IItems }>): {
  promise: Promise<void>;
  sent: IItems[];
  sleeps: number[];
} {
  const sent: IItems[] = [];
  const sleeps: number[] = [];
  const promise = DynamoUtil_sendBatchWriteWithRetry({
    requestItems: puts(25),
    context: "put lftHistoryRecords",
    log,
    send: async (items) => {
      sent.push(items);
      const response = responses.shift() ?? {};
      if (response instanceof Error) {
        throw response;
      }
      return response;
    },
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  });
  return { promise, sent, sleeps };
}

describe("DynamoUtil_sendBatchWriteWithRetry", () => {
  it("resends the same group after a thrown ThrottlingException", async () => {
    const { promise, sent, sleeps } = run([throttle(), throttle(), {}]);
    await promise;
    expect(sent).to.have.length(3);
    expect(sent[2].lftHistoryRecords).to.have.length(25);
    expect(sleeps).to.have.length(2);
  });

  it("resends only the unprocessed items", async () => {
    const { promise, sent } = run([{ UnprocessedItems: puts(4) }, {}]);
    await promise;
    expect(sent[1].lftHistoryRecords).to.have.length(4);
  });

  it("throws the ThrottlingException after the last attempt", async () => {
    const { promise, sent } = run(Array.from({ length: 8 }, throttle));
    const error = await promise.then(
      () => undefined,
      (e: unknown) => e
    );
    expect(error).to.be.instanceOf(Error).and.have.property("name", "ThrottlingException");
    expect(sent).to.have.length(8);
  });

  it("does not retry other errors", async () => {
    const validation = new Error("Provided list of item keys contains duplicates");
    validation.name = "ValidationException";
    const { promise, sent } = run([validation, {}]);
    const error = await promise.then(
      () => undefined,
      (e: unknown) => e
    );
    expect(error).to.equal(validation);
    expect(sent).to.have.length(1);
  });
});
