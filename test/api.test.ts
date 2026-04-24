/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getRawHandler, IHandler } from "../lambda";
import { buildMockDi, IMockDI } from "./utils/mockDi";
import { MockLogUtil } from "./utils/mockLogUtil";
import { userTableNames } from "../lambda/dao/userDao";
import { freeUsersTableNames } from "../lambda/dao/freeUserDao";
import { Storage_getDefault } from "../src/models/storage";
import { Service } from "../src/api/service";
import { MockFetch } from "./utils/mockFetch";
import sinon from "sinon";

function buildEvent(
  method: string,
  path: string,
  opts?: { body?: unknown; headers?: Record<string, string>; qs?: Record<string, string> }
): APIGatewayProxyEvent {
  return {
    body: opts?.body ? JSON.stringify(opts.body) : null,
    headers: opts?.headers || {},
    multiValueHeaders: {},
    httpMethod: method,
    isBase64Encoded: false,
    path,
    pathParameters: {},
    queryStringParameters: opts?.qs || {},
    multiValueQueryStringParameters: {},
    stageVariables: {},
    requestContext: {} as any,
    resource: "",
  };
}

function parseBody(result: APIGatewayProxyResult): any {
  return JSON.parse(result.body);
}

function apiHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}

describe("API v1", () => {
  let sandbox: sinon.SinonSandbox;
  let di: IMockDI;
  let handler: IHandler;
  let service: Service;
  let userId: string;

  beforeEach(async () => {
    (global as any).__API_HOST__ = "https://www.liftosaur.com";
    (global as any).__HOST__ = "https://www.liftosaur.com";
    (global as any).__ENV__ = "prod";
    (global as any).__FULL_COMMIT_HASH__ = "abc123";
    (global as any).__COMMIT_HASH__ = "abc123";
    (global as any).Rollbar = { configure: () => undefined };

    sandbox = sinon.createSandbox();
    let ts = 1000000;
    sandbox.stub(Date, "now").callsFake(() => {
      ts += 1;
      return ts;
    });

    const storage = Storage_getDefault();
    userId = storage.tempUserId;
    storage.subscription = { apple: [], google: [], key: "test-sub-key" };

    const log = new MockLogUtil();
    const mockFetch = new MockFetch(userId, []);
    di = buildMockDi(log, mockFetch.fetch.bind(mockFetch));
    handler = getRawHandler(() => di);
    mockFetch.handler = handler;

    di.dynamo.addMockData({
      [userTableNames.prod.users]: {
        [JSON.stringify({ id: userId })]: {
          id: userId,
          email: "test@example.com",
          createdAt: Date.now(),
          storage,
        },
      },
      [freeUsersTableNames.prod.freeUsers]: {
        [JSON.stringify({ id: userId })]: {
          id: userId,
          key: "test-sub-key",
          isClaimed: true,
          expires: Date.now() + 999999999,
        },
      },
    });

    service = new Service(mockFetch.fetch.bind(mockFetch));
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("API key management (via Service)", () => {
    it("creates and lists API keys", async () => {
      const created = await service.createApiKey("My Key");
      expect(created).to.not.be.undefined;
      expect(created!.name).to.equal("My Key");
      expect(created!.key).to.match(/^lftsk_/);

      const keys = await service.getApiKeys();
      expect(keys.length).to.equal(1);
      expect(keys[0].name).to.equal("My Key");
    });

    it("deletes an API key", async () => {
      const created = await service.createApiKey("To Delete");
      expect(created).to.not.be.undefined;

      const success = await service.deleteApiKey(created!.key);
      expect(success).to.equal(true);

      const keys = await service.getApiKeys();
      expect(keys.length).to.equal(0);
    });
  });

  describe("auth middleware", () => {
    it("rejects requests without API key", async () => {
      const result = await handler(buildEvent("GET", "/api/v1/history"), { getRemainingTimeInMillis: () => 10000 });
      expect(result.statusCode).to.equal(401);
      expect(parseBody(result).error.code).to.equal("unauthorized");
    });

    it("rejects invalid API key", async () => {
      const result = await handler(buildEvent("GET", "/api/v1/history", { headers: apiHeaders("lftsk_invalid") }), {
        getRemainingTimeInMillis: () => 10000,
      });
      expect(result.statusCode).to.equal(401);
    });

    it("rejects users without subscription", async () => {
      const created = await service.createApiKey("No Sub Key");
      await di.dynamo.remove({ tableName: freeUsersTableNames.prod.freeUsers, key: { id: userId } });
      const user = await di.dynamo.get<any>({ tableName: userTableNames.prod.users, key: { id: userId } });
      user.storage.subscription = {};
      await di.dynamo.put({ tableName: userTableNames.prod.users, item: user });

      const result = await handler(buildEvent("GET", "/api/v1/history", { headers: apiHeaders(created!.key) }), {
        getRemainingTimeInMillis: () => 10000,
      });
      expect(result.statusCode).to.equal(403);
      expect(parseBody(result).error.code).to.equal("subscription_required");
    });
  });

  describe("history endpoints", () => {
    let apiKey: string;

    beforeEach(async () => {
      const created = await service.createApiKey("History Key");
      apiKey = created!.key;
    });

    it("returns empty history", async () => {
      const result = await handler(buildEvent("GET", "/api/v1/history", { headers: apiHeaders(apiKey) }), {
        getRemainingTimeInMillis: () => 10000,
      });
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.data.records).to.deep.equal([]);
      expect(body.data.hasMore).to.equal(false);
    });

    it("creates, updates, and deletes a history record", async () => {
      const historyText = `2025-03-01 10:00:00 +00:00 / exercises: {
  Squat / 3x5 100lb
}`;
      const createResult = await handler(
        buildEvent("POST", "/api/v1/history", {
          headers: apiHeaders(apiKey),
          body: { text: historyText },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(createResult.statusCode).to.equal(201);
      const created = parseBody(createResult);
      const recordId = created.data.id;
      expect(recordId).to.be.a("number");

      const listResult = await handler(buildEvent("GET", "/api/v1/history", { headers: apiHeaders(apiKey) }), {
        getRemainingTimeInMillis: () => 10000,
      });
      expect(parseBody(listResult).data.records.length).to.equal(1);

      const updatedText = `2025-03-01 10:00:00 +00:00 / exercises: {
  Squat / 3x5 120lb
}`;
      const updateResult = await handler(
        buildEvent("PUT", `/api/v1/history/${recordId}`, {
          headers: apiHeaders(apiKey),
          body: { text: updatedText },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(updateResult.statusCode).to.equal(200);

      const deleteResult = await handler(
        buildEvent("DELETE", `/api/v1/history/${recordId}`, { headers: apiHeaders(apiKey) }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(deleteResult.statusCode).to.equal(200);
      expect(parseBody(deleteResult).data.deleted).to.equal(true);

      const listAfter = await handler(buildEvent("GET", "/api/v1/history", { headers: apiHeaders(apiKey) }), {
        getRemainingTimeInMillis: () => 10000,
      });
      expect(parseBody(listAfter).data.records.length).to.equal(0);
    });

    it("links history record to program when program name is provided", async () => {
      const programText = `# Week 1
## Push Day
Squat / 3x5 / 100lb / progress: lp(5lb)
Bench Press / 3x8 / 80lb`;

      const createProgram = await handler(
        buildEvent("POST", "/api/v1/programs", {
          headers: apiHeaders(apiKey),
          body: { name: "My Program", text: programText },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(createProgram.statusCode).to.equal(201);

      const historyText = `2025-03-01 10:00:00 +00:00 / program: "My Program" / dayName: "Push Day" / week: 1 / dayInWeek: 1 / exercises: {
  Squat / 3x5 100lb
  Bench Press / 3x8 80lb
}`;
      const createResult = await handler(
        buildEvent("POST", "/api/v1/history", {
          headers: apiHeaders(apiKey),
          body: { text: historyText },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(createResult.statusCode).to.equal(201);
      const record = parseBody(createResult);
      expect(record.data.text).to.include(`program: "My Program"`);
      expect(record.data.text).to.include("Squat");
      expect(record.data.text).to.include("Bench Press");
    });

    it("returns error when program name not found", async () => {
      const historyText = `2025-03-01 10:00:00 +00:00 / program: "Nonexistent Program" / dayName: "Day 1" / week: 1 / dayInWeek: 1 / exercises: {
  Squat / 3x5 100lb
}`;
      const result = await handler(
        buildEvent("POST", "/api/v1/history", {
          headers: apiHeaders(apiKey),
          body: { text: historyText },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(result.statusCode).to.equal(400);
      expect(parseBody(result).error.message).to.include("Nonexistent Program");
    });

    it("creates adhoc history record without program", async () => {
      const historyText = `2025-03-01 10:00:00 +00:00 / exercises: {
  Squat / 3x5 100lb
}`;
      const result = await handler(
        buildEvent("POST", "/api/v1/history", {
          headers: apiHeaders(apiKey),
          body: { text: historyText },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(result.statusCode).to.equal(201);
    });

    it("returns 422 for invalid history text", async () => {
      const result = await handler(
        buildEvent("POST", "/api/v1/history", {
          headers: apiHeaders(apiKey),
          body: { text: "not valid liftohistory" },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(result.statusCode).to.equal(422);
      expect(parseBody(result).error.code).to.equal("parse_error");
    });
  });

  describe("program endpoints", () => {
    let apiKey: string;

    beforeEach(async () => {
      const created = await service.createApiKey("Program Key");
      apiKey = created!.key;
    });

    it("returns empty programs list", async () => {
      const result = await handler(buildEvent("GET", "/api/v1/programs", { headers: apiHeaders(apiKey) }), {
        getRemainingTimeInMillis: () => 10000,
      });
      expect(result.statusCode).to.equal(200);
      expect(parseBody(result).data.programs).to.deep.equal([]);
    });

    it("creates, reads, updates, and deletes a program", async () => {
      const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: lp(5lb)`;

      const createResult = await handler(
        buildEvent("POST", "/api/v1/programs", {
          headers: apiHeaders(apiKey),
          body: { name: "Test Program", text: programText },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(createResult.statusCode).to.equal(201);
      const created = parseBody(createResult);
      const programId = created.data.id;
      expect(programId).to.be.a("string");
      expect(created.data.name).to.equal("Test Program");

      const getResult = await handler(
        buildEvent("GET", `/api/v1/programs/${programId}`, { headers: apiHeaders(apiKey) }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(getResult.statusCode).to.equal(200);
      expect(parseBody(getResult).data.text).to.include("Squat");

      const updatedText = `# Week 1
## Day 1
Squat / 3x5 / 120lb / progress: lp(5lb)`;

      const updateResult = await handler(
        buildEvent("PUT", `/api/v1/programs/${programId}`, {
          headers: apiHeaders(apiKey),
          body: { text: updatedText },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(updateResult.statusCode).to.equal(200);
      expect(parseBody(updateResult).data.text).to.include("120lb");

      const deleteResult = await handler(
        buildEvent("DELETE", `/api/v1/programs/${programId}`, { headers: apiHeaders(apiKey) }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(deleteResult.statusCode).to.equal(200);
      expect(parseBody(deleteResult).data.deleted).to.equal(true);
    });

    it("returns 422 for invalid program text", async () => {
      const result = await handler(
        buildEvent("POST", "/api/v1/programs", {
          headers: apiHeaders(apiKey),
          body: { name: "Bad", text: "not valid liftoscript {{{}}" },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(result.statusCode).to.equal(422);
      expect(parseBody(result).error.code).to.equal("parse_error");
    });
  });

  describe("playground endpoint", () => {
    let apiKey: string;

    beforeEach(async () => {
      const created = await service.createApiKey("Playground Key");
      apiKey = created!.key;
    });

    it("returns workout template without commands", async () => {
      const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: lp(5lb)`;

      const result = await handler(
        buildEvent("POST", "/api/v1/playground", {
          headers: apiHeaders(apiKey),
          body: { programText },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.data.workout).to.include("exercises: {");
      expect(body.data.updatedProgramText).to.be.undefined;
    });

    it("completes sets and finishes workout with progression", async () => {
      const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: lp(5lb)`;

      const result = await handler(
        buildEvent("POST", "/api/v1/playground", {
          headers: apiHeaders(apiKey),
          body: {
            programText,
            day: 1,
            week: 1,
            commands: ["complete_set(1, 1)", "complete_set(1, 2)", "complete_set(1, 3)", "finish_workout()"],
          },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.data.workout).to.include("Squat");
      expect(body.data.updatedProgramText).to.be.a("string");
      expect(body.data.updatedProgramText).to.include("105lb");
    });

    it("changes weight before completing", async () => {
      const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: lp(5lb)`;

      const result = await handler(
        buildEvent("POST", "/api/v1/playground", {
          headers: apiHeaders(apiKey),
          body: {
            programText,
            commands: ["change_weight(1, 1, 120lb)", "complete_set(1, 1)"],
          },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(result.statusCode).to.equal(200);
      expect(parseBody(result).data.workout).to.include("120lb");
    });

    it("returns error for invalid command", async () => {
      const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb`;

      const result = await handler(
        buildEvent("POST", "/api/v1/playground", {
          headers: apiHeaders(apiKey),
          body: { programText, commands: ["invalid_command()"] },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(result.statusCode).to.equal(400);
    });
  });

  describe("stats endpoints", () => {
    let apiKey: string;

    beforeEach(async () => {
      const created = await service.createApiKey("Stats Key");
      apiKey = created!.key;
    });

    it("returns empty stats", async () => {
      const result = await handler(buildEvent("GET", "/api/v1/stats", { headers: apiHeaders(apiKey) }), {
        getRemainingTimeInMillis: () => 10000,
      });
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.data.measurements).to.deep.equal([]);
    });

    it("creates a bodyweight measurement", async () => {
      const createResult = await handler(
        buildEvent("POST", "/api/v1/stats", {
          headers: apiHeaders(apiKey),
          body: {
            measurements: [{ type: "weight", name: "weight", value: { value: 79.5, unit: "kg" } }],
          },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(createResult.statusCode).to.equal(201);
      const created = parseBody(createResult);
      expect(created.data.measurements).to.have.length(1);
      expect(created.data.measurements[0].type).to.equal("weight");
      expect(created.data.measurements[0].name).to.equal("weight");
      expect(created.data.measurements[0].value.value).to.equal(79.5);
      expect(created.data.measurements[0].value.unit).to.equal("kg");
      expect(created.data.measurements[0].timestamp).to.be.a("number");

      const listResult = await handler(buildEvent("GET", "/api/v1/stats", { headers: apiHeaders(apiKey) }), {
        getRemainingTimeInMillis: () => 10000,
      });
      expect(parseBody(listResult).data.measurements).to.have.length(1);
    });

    it("creates multiple measurements in one request", async () => {
      const createResult = await handler(
        buildEvent("POST", "/api/v1/stats", {
          headers: apiHeaders(apiKey),
          body: {
            measurements: [
              { type: "weight", name: "weight", value: { value: 79.5, unit: "kg" } },
              { type: "percentage", name: "bodyfat", value: { value: 15.2 } },
              { type: "length", name: "waist", value: { value: 84, unit: "cm" } },
            ],
          },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(createResult.statusCode).to.equal(201);
      expect(parseBody(createResult).data.measurements).to.have.length(3);
    });

    it("creates a measurement with explicit timestamp", async () => {
      const ts = 1700000000000;
      const createResult = await handler(
        buildEvent("POST", "/api/v1/stats", {
          headers: apiHeaders(apiKey),
          body: {
            measurements: [{ type: "weight", name: "weight", value: { value: 80, unit: "kg" } }],
            timestamp: ts,
          },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(createResult.statusCode).to.equal(201);
      expect(parseBody(createResult).data.measurements[0].timestamp).to.equal(ts);
    });

    it("filters stats by type", async () => {
      await handler(
        buildEvent("POST", "/api/v1/stats", {
          headers: apiHeaders(apiKey),
          body: {
            measurements: [
              { type: "weight", name: "weight", value: { value: 79.5, unit: "kg" } },
              { type: "percentage", name: "bodyfat", value: { value: 15.2 } },
            ],
          },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );

      const result = await handler(
        buildEvent("GET", "/api/v1/stats", { headers: apiHeaders(apiKey), qs: { type: "weight" } }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.data.measurements).to.have.length(1);
      expect(body.data.measurements[0].type).to.equal("weight");
    });

    it("filters stats by name", async () => {
      await handler(
        buildEvent("POST", "/api/v1/stats", {
          headers: apiHeaders(apiKey),
          body: {
            measurements: [
              { type: "length", name: "waist", value: { value: 84, unit: "cm" } },
              { type: "length", name: "chest", value: { value: 100, unit: "cm" } },
            ],
          },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );

      const result = await handler(
        buildEvent("GET", "/api/v1/stats", { headers: apiHeaders(apiKey), qs: { name: "waist" } }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(result.statusCode).to.equal(200);
      expect(parseBody(result).data.measurements).to.have.length(1);
      expect(parseBody(result).data.measurements[0].name).to.equal("waist");
    });

    it("deletes a stat by timestamp", async () => {
      const createResult = await handler(
        buildEvent("POST", "/api/v1/stats", {
          headers: apiHeaders(apiKey),
          body: {
            measurements: [{ type: "weight", name: "weight", value: { value: 79.5, unit: "kg" } }],
          },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      const ts = parseBody(createResult).data.measurements[0].timestamp;

      const deleteResult = await handler(
        buildEvent("DELETE", `/api/v1/stats/${ts}`, { headers: apiHeaders(apiKey), qs: { name: "weight" } }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(deleteResult.statusCode).to.equal(200);
      expect(parseBody(deleteResult).data.deleted).to.equal(true);

      const listResult = await handler(buildEvent("GET", "/api/v1/stats", { headers: apiHeaders(apiKey) }), {
        getRemainingTimeInMillis: () => 10000,
      });
      expect(parseBody(listResult).data.measurements).to.have.length(0);
    });

    it("returns 400 for invalid type", async () => {
      const result = await handler(
        buildEvent("POST", "/api/v1/stats", {
          headers: apiHeaders(apiKey),
          body: {
            measurements: [{ type: "invalid", name: "weight", value: { value: 79.5, unit: "kg" } }],
          },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(result.statusCode).to.equal(400);
    });

    it("returns 400 for invalid name", async () => {
      const result = await handler(
        buildEvent("POST", "/api/v1/stats", {
          headers: apiHeaders(apiKey),
          body: {
            measurements: [{ type: "weight", name: "bicep", value: { value: 79.5, unit: "kg" } }],
          },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(result.statusCode).to.equal(400);
    });

    it("returns 400 for missing measurements", async () => {
      const result = await handler(
        buildEvent("POST", "/api/v1/stats", {
          headers: apiHeaders(apiKey),
          body: {},
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(result.statusCode).to.equal(400);
    });

    it("returns 400 for delete without name", async () => {
      const result = await handler(
        buildEvent("DELETE", "/api/v1/stats/1700000000000", { headers: apiHeaders(apiKey) }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(result.statusCode).to.equal(400);
    });

    it("returns 404 for delete of nonexistent stat", async () => {
      const result = await handler(
        buildEvent("DELETE", "/api/v1/stats/9999999999999", {
          headers: apiHeaders(apiKey),
          qs: { name: "weight" },
        }),
        { getRemainingTimeInMillis: () => 10000 }
      );
      expect(result.statusCode).to.equal(404);
    });
  });

  describe("CORS", () => {
    it("returns CORS headers on OPTIONS", async () => {
      const result = await handler(buildEvent("OPTIONS", "/api/v1/history"), { getRemainingTimeInMillis: () => 10000 });
      expect(result.statusCode).to.equal(200);
      expect(result.headers?.["access-control-allow-origin"]).to.equal("*");
      expect(result.headers?.["access-control-allow-methods"]).to.include("GET");
    });
  });
});
