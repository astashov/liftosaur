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
import { ApiKeyAuth_deviceIdForKey } from "../lambda/utils/apiKeyAuth";
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

  describe("gym and equipment endpoints", () => {
    let apiKey: string;
    const ctx = { getRemainingTimeInMillis: () => 10000 };

    beforeEach(async () => {
      const created = await service.createApiKey("Equipment Key");
      apiKey = created!.key;
    });

    async function req(method: string, path: string, body?: unknown): Promise<{ status: number; data: any }> {
      const result = await handler(buildEvent(method, path, { headers: apiHeaders(apiKey), body }), ctx);
      return { status: result.statusCode, data: parseBody(result) };
    }

    async function firstGymId(): Promise<string> {
      const { data } = await req("GET", "/api/v1/gyms");
      return data.data.gyms[0].id;
    }

    it("lists gyms", async () => {
      const { status, data } = await req("GET", "/api/v1/gyms");
      expect(status).to.equal(200);
      expect(data.data.gyms).to.have.lengthOf(1);
      expect(data.data.currentGymId).to.be.a("string");
    });

    it("lists and updates equipment via REST", async () => {
      const gymId = await firstGymId();
      const list = await req("GET", `/api/v1/gyms/${gymId}/equipment`);
      expect(list.status).to.equal(200);
      expect(list.data.data.equipment.map((e: any) => e.id)).to.include("barbell");

      const upd = await req("PUT", `/api/v1/gyms/${gymId}/equipment/barbell`, {
        bar: { lb: "45lb" },
        plates: [{ weight: "45lb", num: 6 }],
      });
      expect(upd.status).to.equal(200);
      expect(upd.data.data.plates).to.deep.equal([{ weight: "45lb", num: 6 }]);
    });

    it("routes /gyms/:id/equipment distinctly from /gyms/:id", async () => {
      const gymId = await firstGymId();
      const equip = await req("GET", `/api/v1/gyms/${gymId}/equipment/barbell`);
      expect(equip.status).to.equal(200);
      expect(equip.data.data.id).to.equal("barbell");
    });

    it("rejects malformed weights with 400", async () => {
      const gymId = await firstGymId();
      for (const weight of ["lots", "...lb", "+.kg", "1.2.3lb"]) {
        const res = await req("PUT", `/api/v1/gyms/${gymId}/equipment/barbell`, {
          plates: [{ weight, num: 4 }],
        });
        expect(res.status, `expected ${weight} to be rejected`).to.equal(400);
        expect(res.data.error.message).to.include("Invalid weight");
      }
    });

    it("applies similarTo, useBodyweightForBar, isAssisting over REST", async () => {
      const gymId = await firstGymId();
      const res = await req("PUT", `/api/v1/gyms/${gymId}/equipment/barbell`, {
        similarTo: "dumbbell",
        useBodyweightForBar: true,
        isAssisting: true,
      });
      expect(res.status).to.equal(200);
      expect(res.data.data.similarTo).to.equal("dumbbell");
      expect(res.data.data.useBodyweightForBar).to.equal(true);
      expect(res.data.data.isAssisting).to.equal(true);
    });

    it("creates custom equipment (201), then soft-deletes it but keeps it listed", async () => {
      const gymId = await firstGymId();
      const created = await req("POST", `/api/v1/gyms/${gymId}/equipment`, { name: "Battle Rope" });
      expect(created.status).to.equal(201);
      const id = created.data.data.id;
      expect(id).to.match(/^equipment-/);
      expect(created.data.data.isDeleted).to.equal(false);

      const del = await req("PUT", `/api/v1/gyms/${gymId}/equipment/${id}`, { isDeleted: true });
      expect(del.status).to.equal(200);
      expect(del.data.data.isDeleted).to.equal(true);

      const list = await req("GET", `/api/v1/gyms/${gymId}/equipment`);
      const entry = list.data.data.equipment.find((e: any) => e.id === id);
      expect(entry.isDeleted).to.equal(true);
    });

    it("deletes/restores a built-in via update isDeleted, always listed", async () => {
      const gymId = await firstGymId();

      const del = await req("PUT", `/api/v1/gyms/${gymId}/equipment/barbell`, { isDeleted: true });
      expect(del.status).to.equal(200);
      expect(del.data.data.isDeleted).to.equal(true);

      const list = await req("GET", `/api/v1/gyms/${gymId}/equipment`);
      const barbell = list.data.data.equipment.find((e: any) => e.id === "barbell");
      expect(barbell.isDeleted).to.equal(true);

      const get = await req("GET", `/api/v1/gyms/${gymId}/equipment/barbell`);
      expect(get.status).to.equal(200);
      expect(get.data.data.isDeleted).to.equal(true);

      const restore = await req("PUT", `/api/v1/gyms/${gymId}/equipment/barbell`, { isDeleted: false });
      expect(restore.data.data.isDeleted).to.equal(false);
    });

    it("rejects a non-boolean isDeleted field", async () => {
      const gymId = await firstGymId();
      const res = await req("PUT", `/api/v1/gyms/${gymId}/equipment/barbell`, { isDeleted: "yes" });
      expect(res.status).to.equal(400);
    });

    it("returns 400 (not 500) for a non-string equipment name on create", async () => {
      const gymId = await firstGymId();
      for (const name of [123, {}, []]) {
        const res = await req("POST", `/api/v1/gyms/${gymId}/equipment`, { name });
        expect(res.status, `name=${JSON.stringify(name)} should be 400`).to.equal(400);
        expect(res.data.error.code).to.equal("invalid_input");
      }
    });

    it("full gym lifecycle over REST", async () => {
      const created = await req("POST", "/api/v1/gyms", { name: "Home" });
      expect(created.status).to.equal(201);
      const gymId = created.data.data.id;

      const renamed = await req("PUT", `/api/v1/gyms/${gymId}`, { name: "Garage", setCurrent: true });
      expect(renamed.data.data.name).to.equal("Garage");
      expect(renamed.data.data.isCurrent).to.equal(true);

      const del = await req("DELETE", `/api/v1/gyms/${gymId}`);
      expect(del.status).to.equal(200);
    });

    it("rejects a non-boolean setCurrent on update gym (no silent no-op)", async () => {
      const created = await req("POST", "/api/v1/gyms", { name: "Spot" });
      const gymId = created.data.data.id;
      const res = await req("PUT", `/api/v1/gyms/${gymId}`, { setCurrent: "true" });
      expect(res.status).to.equal(400);
      expect(res.data.error.code).to.equal("invalid_input");
    });

    it("404s on unknown gym", async () => {
      const res = await req("GET", "/api/v1/gyms/missing/equipment");
      expect(res.status).to.equal(404);
    });
  });

  describe("exercise data endpoints", () => {
    let apiKey: string;
    const ctx = { getRemainingTimeInMillis: () => 10000 };

    beforeEach(async () => {
      const created = await service.createApiKey("Exercise Data Key");
      apiKey = created!.key;
    });

    async function req(method: string, path: string, body?: unknown): Promise<{ status: number; data: any }> {
      const result = await handler(buildEvent(method, path, { headers: apiHeaders(apiKey), body }), ctx);
      return { status: result.statusCode, data: parseBody(result) };
    }

    it("starts empty, then sets, gets, lists and deletes exercise data", async () => {
      const empty = await req("GET", "/api/v1/exercise-data");
      expect(empty.status).to.equal(200);
      expect(empty.data.data.exerciseData).to.deep.equal([]);

      const set = await req("PUT", "/api/v1/exercise-data/squat_barbell", { rm1: "315lb", rounding: 5 });
      expect(set.status).to.equal(200);
      expect(set.data.data.key).to.equal("squat_barbell");
      expect(set.data.data.exerciseName).to.equal("Squat");
      expect(set.data.data.rm1).to.equal("315lb");
      expect(set.data.data.rounding).to.equal(5);

      const get = await req("GET", "/api/v1/exercise-data/squat_barbell");
      expect(get.status).to.equal(200);
      expect(get.data.data.rm1).to.equal("315lb");

      const list = await req("GET", "/api/v1/exercise-data");
      expect(list.data.data.exerciseData.map((e: any) => e.key)).to.include("squat_barbell");

      const del = await req("DELETE", "/api/v1/exercise-data/squat_barbell");
      expect(del.status).to.equal(200);
      expect(del.data.data.deleted).to.equal(true);

      const after = await req("GET", "/api/v1/exercise-data/squat_barbell");
      expect(after.status).to.equal(404);
    });

    it("merges fields on upsert and clears a single field with null", async () => {
      await req("PUT", "/api/v1/exercise-data/benchPress", { rm1: "225lb", notes: "elbows in" });
      const merged = await req("PUT", "/api/v1/exercise-data/benchPress", { rounding: 2.5 });
      expect(merged.data.data.rm1).to.equal("225lb");
      expect(merged.data.data.notes).to.equal("elbows in");
      expect(merged.data.data.rounding).to.equal(2.5);

      const cleared = await req("PUT", "/api/v1/exercise-data/benchPress", { notes: null });
      expect(cleared.data.data.notes).to.equal(undefined);
      expect(cleared.data.data.rm1).to.equal("225lb");
    });

    it("rejects an unknown exercise key with 400", async () => {
      const res = await req("PUT", "/api/v1/exercise-data/notARealExercise", { rm1: "100lb" });
      expect(res.status).to.equal(400);
      expect(res.data.error.code).to.equal("invalid_input");
    });

    it("rejects a malformed rm1 weight with 400", async () => {
      const res = await req("PUT", "/api/v1/exercise-data/squat_barbell", { rm1: "lots" });
      expect(res.status).to.equal(400);
      expect(res.data.error.message).to.include("Invalid weight");
    });

    it("rejects an invalid muscle in muscleMultipliers with 400", async () => {
      const res = await req("PUT", "/api/v1/exercise-data/squat_barbell", {
        muscleMultipliers: { NotAMuscle: 1 },
      });
      expect(res.status).to.equal(400);
    });

    it("rejects an equipment override for an unknown gym with 400", async () => {
      const res = await req("PUT", "/api/v1/exercise-data/squat_barbell", {
        equipment: { nope: "barbell" },
      });
      expect(res.status).to.equal(400);
      expect(res.data.error.message).to.include("unknown gym");
    });

    it("404s deleting exercise data that was never set", async () => {
      const res = await req("DELETE", "/api/v1/exercise-data/deadlift_barbell");
      expect(res.status).to.equal(404);
    });

    it("hides an entry whose last field was cleared, but allows re-adding it (no tombstone block)", async () => {
      await req("PUT", "/api/v1/exercise-data/squat_barbell", { notes: "depth" });
      const cleared = await req("PUT", "/api/v1/exercise-data/squat_barbell", { notes: null });
      expect(cleared.status).to.equal(200);
      expect(cleared.data.data.notes).to.equal(undefined);

      const get = await req("GET", "/api/v1/exercise-data/squat_barbell");
      expect(get.status).to.equal(404);

      const list = await req("GET", "/api/v1/exercise-data");
      expect(list.data.data.exerciseData.map((e: any) => e.key)).to.not.include("squat_barbell");

      // The whole point of not deleting the key: re-adding must work and surface again.
      const readded = await req("PUT", "/api/v1/exercise-data/squat_barbell", { rm1: "315lb" });
      expect(readded.status).to.equal(200);
      expect(readded.data.data.rm1).to.equal("315lb");
      const getAgain = await req("GET", "/api/v1/exercise-data/squat_barbell");
      expect(getAgain.status).to.equal(200);
      expect(getAgain.data.data.rm1).to.equal("315lb");
    });

    it("DELETE hides the entry but allows re-adding it", async () => {
      await req("PUT", "/api/v1/exercise-data/benchPress", { rm1: "225lb" });
      const del = await req("DELETE", "/api/v1/exercise-data/benchPress");
      expect(del.status).to.equal(200);
      expect((await req("GET", "/api/v1/exercise-data/benchPress")).status).to.equal(404);
      // Deleting again is a 404 (already empty)
      expect((await req("DELETE", "/api/v1/exercise-data/benchPress")).status).to.equal(404);

      const readded = await req("PUT", "/api/v1/exercise-data/benchPress", { rm1: "235lb" });
      expect(readded.status).to.equal(200);
      expect(readded.data.data.rm1).to.equal("235lb");
    });

    it("rejects an unknown equipment suffix in the key with 400", async () => {
      const res = await req("PUT", "/api/v1/exercise-data/squat_notRealEquipment", { rm1: "100lb" });
      expect(res.status).to.equal(400);
      expect(res.data.error.message).to.include("Unknown equipment");
    });

    it("rejects a non-canonical key with extra underscore segments with 400", async () => {
      // "squat_barbell_extra" parses to the canonical "squat_barbell", so storing under the original key
      // would be silently unreadable by the app.
      const res = await req("PUT", "/api/v1/exercise-data/squat_barbell_extra", { rm1: "100lb" });
      expect(res.status).to.equal(400);
      expect(res.data.error.message).to.include("Malformed exercise key");

      const get = await req("GET", "/api/v1/exercise-data/squat_barbell_extra");
      expect(get.status).to.equal(404);
    });

    it("accepts a valid built-in equipment suffix", async () => {
      const res = await req("PUT", "/api/v1/exercise-data/squat_dumbbell", { rm1: "100lb" });
      expect(res.status).to.equal(200);
      expect(res.data.data.key).to.equal("squat_dumbbell");
    });

    async function firstGymId(): Promise<string> {
      const { data } = await req("GET", "/api/v1/gyms");
      return data.data.gyms[0].id;
    }

    it("treats a per-gym 'None' (null) as an omitted gym, not a stored undefined (round-trips through Dynamo)", async () => {
      const gymId = await firstGymId();
      // gymA gets a real equipment, gymB is set to None — only gymA should survive in the map.
      const res = await req("PUT", "/api/v1/exercise-data/squat_barbell", {
        equipment: { [gymId]: "dumbbell" },
      });
      expect(res.status).to.equal(200);
      expect(res.data.data.equipment).to.deep.equal({ [gymId]: "dumbbell" });

      const none = await req("PUT", "/api/v1/exercise-data/squat_barbell", { equipment: { [gymId]: null } });
      expect(none.status).to.equal(200);
      // "None" => the gym is absent from the map (no stored `undefined` that Dynamo would strip differently).
      expect(none.data.data.equipment).to.deep.equal({});
      const get = await req("GET", "/api/v1/exercise-data/squat_barbell");
      expect(get.data.data.equipment).to.deep.equal({});
    });

    it("preserves an inherited app-style 'None' override when updating an unrelated field (regression)", async () => {
      const gymId = await firstGymId();
      // The app stores "None" as { [gymId]: undefined } (editEquipment.ts) and syncs it. Seed exactly that
      // (the mock, like pre-strip Dynamo, keeps the undefined-valued key) — the state that used to 400.
      const stored = await di.dynamo.get<any>({ tableName: userTableNames.prod.users, key: { id: userId } });
      stored.storage.settings.exerciseData = { squat_barbell: { equipment: { [gymId]: undefined } } };
      await di.dynamo.put({ tableName: userTableNames.prod.users, item: stored });

      const upd = await req("PUT", "/api/v1/exercise-data/squat_barbell", { notes: "high bar" });
      expect(upd.status).to.equal(200);
      expect(upd.data.data.notes).to.equal("high bar");
      expect(upd.data.data.equipment).to.deep.equal({});
    });

    it("clears all equipment overrides with top-level null, keeping other fields", async () => {
      const gymId = await firstGymId();
      await req("PUT", "/api/v1/exercise-data/squat_barbell", { rm1: "300lb", equipment: { [gymId]: "dumbbell" } });

      const cleared = await req("PUT", "/api/v1/exercise-data/squat_barbell", { equipment: null });
      expect(cleared.status).to.equal(200);
      expect(cleared.data.data.equipment).to.equal(undefined);
      expect(cleared.data.data.rm1).to.equal("300lb");
    });

    it("rejects an empty update with 400", async () => {
      const res = await req("PUT", "/api/v1/exercise-data/squat_barbell", {});
      expect(res.status).to.equal(400);
      expect(res.data.error.code).to.equal("invalid_input");
    });

    it("resolves exerciseName for a custom exercise id containing '_'", async () => {
      // Legacy/imported custom ids can contain "_"; Exercise_fromKey would mis-split them, so the formatter
      // must look the id up exactly (like validateExerciseKey does) to fill exerciseName.
      const stored = await di.dynamo.get<any>({ tableName: userTableNames.prod.users, key: { id: userId } });
      stored.storage.settings.exercises = {
        legacy_squat: {
          vtype: "custom_exercise",
          id: "legacy_squat",
          name: "Legacy Squat",
          isDeleted: false,
          meta: { bodyParts: [], targetMuscles: [], synergistMuscles: [] },
          types: [],
        },
      };
      await di.dynamo.put({ tableName: userTableNames.prod.users, item: stored });

      const set = await req("PUT", "/api/v1/exercise-data/legacy_squat", { rm1: "225lb" });
      expect(set.status).to.equal(200);
      expect(set.data.data.exerciseName).to.equal("Legacy Squat");

      const get = await req("GET", "/api/v1/exercise-data/legacy_squat");
      expect(get.data.data.exerciseName).to.equal("Legacy Squat");
    });
  });

  describe("measurement endpoints", () => {
    let apiKey: string;
    const ctx = { getRemainingTimeInMillis: () => 10000 };

    beforeEach(async () => {
      const created = await service.createApiKey("Measurements Key");
      apiKey = created!.key;
    });

    async function req(
      method: string,
      path: string,
      body?: unknown,
      qs?: Record<string, string>
    ): Promise<{ status: number; data: any }> {
      const result = await handler(buildEvent(method, path, { headers: apiHeaders(apiKey), body, qs }), ctx);
      return { status: result.statusCode, data: parseBody(result) };
    }

    it("starts empty, then adds, gets, lists and deletes a bodyweight measurement", async () => {
      const empty = await req("GET", "/api/v1/measurements");
      expect(empty.status).to.equal(200);
      expect(empty.data.data.measurements).to.deep.equal([]);

      const add = await req("POST", "/api/v1/measurements/weight", {
        value: "180lb",
        timestamp: 1700000000000,
      });
      expect(add.status).to.equal(201);
      expect(add.data.data.value).to.equal("180lb");
      expect(add.data.data.timestamp).to.equal(1700000000000);
      expect(add.data.data.date).to.equal(new Date(1700000000000).toISOString());

      const get = await req("GET", "/api/v1/measurements/weight");
      expect(get.status).to.equal(200);
      expect(get.data.data.category).to.equal("weight");
      expect(get.data.data.values.length).to.equal(1);
      expect(get.data.data.values[0].value).to.equal("180lb");
      expect(get.data.data.hasMore).to.equal(false);

      const list = await req("GET", "/api/v1/measurements");
      expect(list.data.data.measurements.map((m: any) => m.key)).to.deep.equal(["weight"]);
      expect(list.data.data.measurements[0].count).to.equal(1);
      expect(list.data.data.measurements[0].latest.value).to.equal("180lb");
      expect(list.data.data.measurements[0]).to.not.have.property("values");

      const del = await req("DELETE", "/api/v1/measurements/weight/1700000000000");
      expect(del.status).to.equal(200);
      expect(del.data.data.deleted).to.equal(true);

      const after = await req("GET", "/api/v1/measurements/weight");
      expect(after.data.data.values).to.deep.equal([]);
    });

    it("paginates a key's history newest-first with a timestamp cursor", async () => {
      const base = 1700000000000;
      for (let i = 0; i < 5; i++) {
        const add = await req("POST", "/api/v1/measurements/weight", {
          value: `${180 + i}lb`,
          timestamp: base + i * 86400000,
        });
        expect(add.status).to.equal(201);
      }

      const page1 = await req("GET", "/api/v1/measurements/weight", undefined, { limit: "2" });
      expect(page1.data.data.values.map((v: any) => v.timestamp)).to.deep.equal([
        base + 4 * 86400000,
        base + 3 * 86400000,
      ]);
      expect(page1.data.data.hasMore).to.equal(true);
      expect(page1.data.data.nextCursor).to.equal(base + 3 * 86400000);

      const page2 = await req("GET", "/api/v1/measurements/weight", undefined, {
        limit: "2",
        cursor: String(page1.data.data.nextCursor),
      });
      expect(page2.data.data.values.map((v: any) => v.timestamp)).to.deep.equal([base + 2 * 86400000, base + 86400000]);
      expect(page2.data.data.hasMore).to.equal(true);

      const page3 = await req("GET", "/api/v1/measurements/weight", undefined, {
        limit: "2",
        cursor: String(page2.data.data.nextCursor),
      });
      expect(page3.data.data.values.map((v: any) => v.timestamp)).to.deep.equal([base]);
      expect(page3.data.data.hasMore).to.equal(false);
      expect(page3.data.data.nextCursor).to.equal(undefined);

      // The list summary stays bounded regardless of how many values exist.
      const list = await req("GET", "/api/v1/measurements");
      expect(list.data.data.measurements[0].count).to.equal(5);
      expect(list.data.data.measurements[0].latest.timestamp).to.equal(base + 4 * 86400000);
    });

    it("rejects a non-numeric cursor with 400 (not a 500)", async () => {
      const res = await req("GET", "/api/v1/measurements/weight", undefined, { cursor: "abc" });
      expect(res.status).to.equal(400);
      expect(res.data.error.message).to.include("cursor");
    });

    it("clamps an out-of-range limit instead of erroring", async () => {
      await req("POST", "/api/v1/measurements/weight", { value: "180lb", timestamp: 1700000000000 });
      await req("POST", "/api/v1/measurements/weight", { value: "181lb", timestamp: 1700000086400 });
      const res = await req("GET", "/api/v1/measurements/weight", undefined, { limit: "-1" });
      expect(res.status).to.equal(200);
      expect(res.data.data.values.length).to.equal(1);
      expect(res.data.data.hasMore).to.equal(true);
    });

    it("accepts a length value with its unit suffix", async () => {
      const add = await req("POST", "/api/v1/measurements/chest", { value: "37.5cm" });
      expect(add.status).to.equal(201);
      expect(add.data.data.value).to.equal("37.5cm");
    });

    it("requires an explicit unit suffix (rejects a bare number)", async () => {
      const res = await req("POST", "/api/v1/measurements/weight", { value: "180" });
      expect(res.status).to.equal(400);
      expect(res.data.error.message).to.include("unit suffix");
    });

    it("updates the value at a timestamp, keeping its identity", async () => {
      await req("POST", "/api/v1/measurements/bodyfat", { value: "18%", timestamp: 1700000000000 });

      const upd = await req("PUT", "/api/v1/measurements/bodyfat/1700000000000", { value: "16%" });
      expect(upd.status).to.equal(200);
      expect(upd.data.data.value).to.equal("16%");
      expect(upd.data.data.timestamp).to.equal(1700000000000);

      const get = await req("GET", "/api/v1/measurements/bodyfat");
      expect(get.data.data.values.map((v: any) => v.value)).to.deep.equal(["16%"]);
      expect(get.data.data.values.map((v: any) => v.timestamp)).to.deep.equal([1700000000000]);
    });

    it("re-dates an entry via delete + add", async () => {
      await req("POST", "/api/v1/measurements/bodyfat", { value: "18%", timestamp: 1700000000000 });
      expect((await req("DELETE", "/api/v1/measurements/bodyfat/1700000000000")).status).to.equal(200);
      const re = await req("POST", "/api/v1/measurements/bodyfat", { value: "18%", timestamp: 1700000086400 });
      expect(re.status).to.equal(201);
      const get = await req("GET", "/api/v1/measurements/bodyfat");
      expect(get.data.data.values.map((v: any) => v.timestamp)).to.deep.equal([1700000086400]);
    });

    it("rejects an unknown measurement key with 400", async () => {
      const res = await req("POST", "/api/v1/measurements/notReal", { value: "1lb" });
      expect(res.status).to.equal(400);
      expect(res.data.error.code).to.equal("invalid_input");
    });

    it("rejects a unit that doesn't match the category with 400", async () => {
      const res = await req("POST", "/api/v1/measurements/weight", { value: "80cm" });
      expect(res.status).to.equal(400);
      expect(res.data.error.message).to.include("not valid for a weight measurement");
    });

    it("rejects adding a duplicate timestamp with 409", async () => {
      await req("POST", "/api/v1/measurements/weight", { value: "180lb", timestamp: 1700000000000 });
      const dup = await req("POST", "/api/v1/measurements/weight", { value: "181lb", timestamp: 1700000000000 });
      expect(dup.status).to.equal(409);
    });

    it("404s updating or deleting a missing measurement", async () => {
      expect((await req("PUT", "/api/v1/measurements/weight/123", { value: "1lb" })).status).to.equal(404);
      expect((await req("DELETE", "/api/v1/measurements/weight/123")).status).to.equal(404);
    });

    it("400s (not 404s) on a malformed identity timestamp", async () => {
      for (const ts of ["abc", "1700000000000abc"]) {
        const upd = await req("PUT", `/api/v1/measurements/weight/${ts}`, { value: "1lb" });
        expect(upd.status, `PUT ${ts}`).to.equal(400);
        expect(upd.data.error.message).to.include("timestamp");
        const del = await req("DELETE", `/api/v1/measurements/weight/${ts}`);
        expect(del.status, `DELETE ${ts}`).to.equal(400);
      }
    });

    it("400s on a malformed pagination cursor (trailing garbage)", async () => {
      const res = await req("GET", "/api/v1/measurements/weight", undefined, { cursor: "1700000000000abc" });
      expect(res.status).to.equal(400);
      expect(res.data.error.message).to.include("cursor");
    });

    it("rejects an empty update with 400", async () => {
      await req("POST", "/api/v1/measurements/weight", { value: "180lb", timestamp: 1700000000000 });
      const res = await req("PUT", "/api/v1/measurements/weight/1700000000000", {});
      expect(res.status).to.equal(400);
    });

    describe("health measurements", () => {
      const day1 = 1700000000000;
      const day2 = day1 + 86400000;
      const day3 = day1 + 2 * 86400000;

      function healthRow(key: string, timestamp: number, value: number, extra?: Record<string, unknown>): void {
        const name = `${timestamp}_${key}`;
        di.dynamo.addMockData({
          [userTableNames.prod.stats]: {
            [JSON.stringify({ name, userId })]: {
              userId,
              name,
              type: "health",
              vtype: "stat",
              value,
              timestamp,
              updatedAt: timestamp + 1,
              appleUuid: `${key}-${timestamp}`,
              ...extra,
            },
          },
        });
      }

      it("lists and pages health keys with unit-suffixed values, excluding hidden records", async () => {
        healthRow("sleep", day1, 432);
        healthRow("sleep", day2, 401, { hidden: true });
        healthRow("sleep", day3, 455);
        healthRow("calories", day1, 2150);
        healthRow("protein", day1, 150.5);

        const list = await req("GET", "/api/v1/measurements");
        expect(list.status).to.equal(200);
        const byKey = Object.fromEntries(list.data.data.measurements.map((m: any) => [m.key, m]));
        expect(byKey.sleep.category).to.equal("health");
        expect(byKey.sleep.count).to.equal(2);
        expect(byKey.sleep.latest.value).to.equal("455min");
        expect(byKey.sleep.latest.timestamp).to.equal(day3);
        expect(byKey.calories.latest.value).to.equal("2150kcal");
        expect(byKey.protein.latest.value).to.equal("150.5g");

        const get = await req("GET", "/api/v1/measurements/sleep");
        expect(get.status).to.equal(200);
        expect(get.data.data.category).to.equal("health");
        expect(get.data.data.values.map((v: any) => v.value)).to.deep.equal(["455min", "432min"]);
        expect(get.data.data.hasMore).to.equal(false);
      });

      it("keeps the cursor advancing across hidden records when paging", async () => {
        healthRow("sleep", day1, 432);
        healthRow("sleep", day2, 401, { hidden: true });
        healthRow("sleep", day3, 455);

        const page1 = await req("GET", "/api/v1/measurements/sleep", undefined, { limit: "2" });
        expect(page1.data.data.values.map((v: any) => v.value)).to.deep.equal(["455min"]);
        expect(page1.data.data.hasMore).to.equal(true);
        expect(page1.data.data.nextCursor).to.equal(day2);

        const page2 = await req("GET", "/api/v1/measurements/sleep", undefined, {
          limit: "2",
          cursor: String(page1.data.data.nextCursor),
        });
        expect(page2.data.data.values.map((v: any) => v.value)).to.deep.equal(["432min"]);
        expect(page2.data.data.hasMore).to.equal(false);
      });

      it("rejects adding and editing health keys", async () => {
        healthRow("sleep", day1, 432);
        for (const [method, path, body] of [
          ["POST", "/api/v1/measurements/sleep", { value: "400min" }],
          ["PUT", `/api/v1/measurements/calories/${day1}`, { value: "2000kcal" }],
        ] as const) {
          const res = await req(method, path, body);
          expect(res.status, `${method} ${path}`).to.equal(400);
          expect(res.data.error.message).to.include("can't be added or edited");
        }
        const get = await req("GET", "/api/v1/measurements/sleep");
        expect(get.data.data.values.length).to.equal(1);
      });

      it("hides (not deletes) an imported health record on delete", async () => {
        healthRow("sleep", day1, 432);
        healthRow("sleep", day3, 455);

        const del = await req("DELETE", `/api/v1/measurements/sleep/${day1}`);
        expect(del.status).to.equal(200);
        expect(del.data.data.deleted).to.equal(true);

        const get = await req("GET", "/api/v1/measurements/sleep");
        expect(get.data.data.values.map((v: any) => v.timestamp)).to.deep.equal([day3]);

        // The row survives with hidden=true and its source uuid intact, so the next Health re-import
        // keeps it hidden instead of resurrecting it.
        const row = di.dynamo.data[userTableNames.prod.stats][JSON.stringify({ name: `${day1}_sleep`, userId })] as any;
        expect(row.hidden).to.equal(true);
        expect(row.value).to.equal(432);
        expect(row.appleUuid).to.equal(`sleep-${day1}`);

        // Deleting an already-hidden record behaves like deleting a deleted one.
        const again = await req("DELETE", `/api/v1/measurements/sleep/${day1}`);
        expect(again.status).to.equal(404);
      });
    });
  });

  describe("workout endpoints", () => {
    let apiKey: string;
    let programId: string;
    const ctx = { getRemainingTimeInMillis: () => 10000 };

    const PROGRAM_TEXT = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: lp(5lb)
Bench Press / 2x8 / 50lb

## Day 2
Deadlift / 1x5 / 200lb`;

    async function req(
      method: string,
      path: string,
      body?: unknown,
      headers?: Record<string, string>
    ): Promise<{ status: number; data: any }> {
      const result = await handler(
        buildEvent(method, path, { headers: { ...apiHeaders(apiKey), ...(headers || {}) }, body }),
        ctx
      );
      return { status: result.statusCode, data: parseBody(result) };
    }

    const clientHeaders = { "X-Liftosaur-Client": "test-client/1.2.0", "X-Liftosaur-Device-Id": "test-device-abc123" };

    async function startWorkout(body?: unknown): Promise<{ status: number; data: any }> {
      return req("POST", "/api/v1/workout/start", { programId, ...(body || {}) }, clientHeaders);
    }

    function firstWorkingSet(workout: any): { entryId: string; setId: string } {
      const entry = workout.entries[0];
      return { entryId: entry.entryId, setId: entry.sets[0].setId };
    }

    beforeEach(async () => {
      const created = await service.createApiKey("Workout Key");
      apiKey = created!.key;
      const program = await req("POST", "/api/v1/programs", { name: "Test Program", text: PROGRAM_TEXT });
      programId = program.data.data.id;
    });

    // Guards docs/content/api.md: the published example payload is what a third-party client codes against,
    // so a field renamed or dropped here should fail loudly rather than silently invalidate the docs.
    it("returns exactly the documented payload shape", async () => {
      const next = await req("GET", `/api/v1/workout/next?programId=${programId}`);
      const workout = next.data.data.workout;
      expect(Object.keys(workout).sort()).to.deep.equal(
        ["dayData", "dayName", "entries", "programId", "programName", "startTime"].sort()
      );
      expect(Object.keys(workout.dayData).sort()).to.deep.equal(["day", "dayInWeek", "week"].sort());
      expect(Object.keys(workout.entries[0]).sort()).to.deep.equal(
        [
          "description",
          "equipment",
          "entryId",
          "exerciseId",
          "hasUpdateScript",
          "imageUrl",
          "name",
          "notes",
          "promptedVars",
          "sets",
          "superset",
          "warmupSets",
        ].sort()
      );
      expect(Object.keys(workout.entries[0].sets[0]).sort()).to.deep.equal(
        [
          "askWeight",
          "completed",
          "index",
          "isAmrap",
          "isUnilateral",
          "isWarmup",
          "logRpe",
          "minReps",
          "originalWeight",
          "plates",
          "reps",
          "rpe",
          "setId",
          "setTimer",
          "timer",
          "weight",
        ].sort()
      );
      // entryId is the exercise key plus any label — the docs say so, because it isn't unique.
      expect(workout.entries[0].entryId).to.equal("squat_barbell");
      expect(workout.entries[0].exerciseId).to.equal("squat_barbell");
      // A path, not an absolute URL.
      expect(workout.entries[0].imageUrl).to.match(/^\/externalimages\//);
    });

    it("previews the next workout without creating one", async () => {
      const next = await req("GET", `/api/v1/workout/next?programId=${programId}`);
      expect(next.status).to.equal(200);
      expect(next.data.data.workout.dayName).to.equal("Day 1");
      expect(next.data.data.workout.entries.length).to.equal(2);

      const squat = next.data.data.workout.entries[0];
      expect(squat.name).to.equal("Squat");
      expect(squat.sets.length).to.equal(3);
      expect(squat.sets[0].reps).to.equal(5);
      expect(squat.sets[0].weight).to.equal("100lb");
      expect(squat.sets[0].completed).to.equal(null);
      expect(squat.hasUpdateScript).to.equal(false);

      // Preview creates nothing.
      const current = await req("GET", "/api/v1/workout/current");
      expect(current.data.data.workout).to.equal(null);
    });

    // When a program leaves a rest timer blank, the payload has to carry the user's own default rather than an
    // empty field for the client to guess at. Returning the raw set.timer gives null for every program that
    // doesn't set one explicitly.
    it("resolves rest timers against the user's defaults", async () => {
      const withTimer = await req("POST", "/api/v1/programs", {
        name: "Timers",
        text: `# Week 1\n## Day 1\nSquat / 3x5 / 100lb 240s\nBench Press / 2x8 / 50lb`,
      });
      const pid = withTimer.data.data.id;
      const next = await req("GET", `/api/v1/workout/next?programId=${pid}`);
      const [squat, bench] = next.data.data.workout.entries;

      // An explicit program timer wins.
      expect(squat.sets[0].timer).to.equal(240);
      // A blank one falls back to settings.timers.workout, never null.
      expect(bench.sets[0].timer).to.equal(180);
      // Warmups take the warmup default, never the working-set timer.
      for (const entry of [squat, bench]) {
        for (const w of entry.warmupSets) {
          expect(w.timer).to.equal(90);
        }
      }
    });

    it("404s for a week/day not in the program", async () => {
      const next = await req("GET", `/api/v1/workout/next?programId=${programId}&week=3&dayInWeek=1`);
      expect(next.status).to.equal(404);
      expect(next.data.error.code).to.equal("day_not_found");
    });

    it("runs a whole workout: start, log sets, finish", async () => {
      const started = await startWorkout();
      expect(started.status).to.equal(200);
      const startTime = started.data.data.workout.startTime;
      const { entryId, setId } = firstWorkingSet(started.data.data.workout);

      const logged = await req(
        "POST",
        "/api/v1/workout/set",
        { entryId, setId, completed: { reps: 5, weight: "100lb" } },
        clientHeaders
      );
      expect(logged.status).to.equal(200);
      const set = logged.data.data.workout.entries[0].sets[0];
      expect(set.completed.reps).to.equal(5);
      expect(set.completed.weight).to.equal("100lb");

      const finished = await req(
        "POST",
        "/api/v1/workout/finish",
        { startTime, endTime: startTime + 3600000 },
        clientHeaders
      );
      expect(finished.status).to.equal(200);
      // startTime becomes the finished record's id.
      expect(finished.data.data.workout.id).to.equal(startTime);
      expect(finished.data.data.workout.endTime).to.equal(startTime + 3600000);
      // The day pointer advanced, so the next workout is Day 2.
      expect(finished.data.data.workout.nextDay.dayName).to.equal("Day 2");

      const after = await req("GET", "/api/v1/workout/current");
      expect(after.data.data.workout).to.equal(null);

      const history = await req("GET", "/api/v1/history");
      expect(history.data.data.records.length).to.equal(1);

      const next = await req("GET", `/api/v1/workout/next?programId=${programId}`);
      expect(next.data.data.workout.dayName).to.equal("Day 2");
    });

    it("records the client as the record's source", async () => {
      const started = await startWorkout();
      const startTime = started.data.data.workout.startTime;
      await req("POST", "/api/v1/workout/finish", { startTime }, clientHeaders);

      const record = di.dynamo.data[userTableNames.prod.historyRecords][
        JSON.stringify({ id: startTime, userId })
      ] as any;
      expect(record.source).to.equal("test-client/1.2.0");
    });

    it("treats a replayed finish as idempotent", async () => {
      const started = await startWorkout();
      const startTime = started.data.data.workout.startTime;

      const first = await req("POST", "/api/v1/workout/finish", { startTime }, clientHeaders);
      expect(first.status).to.equal(200);
      const second = await req("POST", "/api/v1/workout/finish", { startTime }, clientHeaders);
      expect(second.status).to.equal(200);
      expect(second.data.data.workout.id).to.equal(first.data.data.workout.id);

      // No second record, and the pointer advanced exactly once.
      const history = await req("GET", "/api/v1/history");
      expect(history.data.data.records.length).to.equal(1);
      const next = await req("GET", `/api/v1/workout/next?programId=${programId}`);
      expect(next.data.data.workout.dayName).to.equal("Day 2");
    });

    it("returns the live workout when start is retried for the same day", async () => {
      const first = await startWorkout();
      const retry = await startWorkout();
      expect(retry.status).to.equal(200);
      expect(retry.data.data.workout.startTime).to.equal(first.data.data.workout.startTime);
    });

    it("409s when a different workout is already live", async () => {
      await startWorkout();
      const other = await req("POST", "/api/v1/workout/start", { programId, week: 1, dayInWeek: 2 }, clientHeaders);
      expect(other.status).to.equal(409);
      expect(other.data.error.code).to.equal("workout_already_active");
    });

    it("409s when the supplied startTime is already a history record's id", async () => {
      const started = await startWorkout();
      const startTime = started.data.data.workout.startTime;
      await req("POST", "/api/v1/workout/finish", { startTime }, clientHeaders);

      const again = await startWorkout({ startTime });
      expect(again.status).to.equal(409);
      expect(again.data.error.code).to.equal("workout_start_time_taken");
    });

    it("accepts client-supplied offline timestamps", async () => {
      const realStart = 1600000000000;
      const started = await startWorkout({ startTime: realStart });
      expect(started.data.data.workout.startTime).to.equal(realStart);

      const finished = await req(
        "POST",
        "/api/v1/workout/finish",
        {
          startTime: realStart,
          endTime: realStart + 3600000,
          intervals: [[realStart, realStart + 3600000]],
        },
        clientHeaders
      );
      expect(finished.status).to.equal(200);
      expect(finished.data.data.workout.endTime).to.equal(realStart + 3600000);
    });

    it("rejects intervals that disagree with startTime", async () => {
      const started = await startWorkout();
      const startTime = started.data.data.workout.startTime;
      const finished = await req(
        "POST",
        "/api/v1/workout/finish",
        { startTime, intervals: [[startTime + 5, startTime + 100]] },
        clientHeaders
      );
      expect(finished.status).to.equal(400);
      expect(finished.data.error.code).to.equal("invalid_input");
    });

    it("appends a set with a client-minted id, and a replayed append is a no-op", async () => {
      const started = await startWorkout();
      const { entryId } = firstWorkingSet(started.data.data.workout);

      const appended = await req(
        "POST",
        "/api/v1/workout/set",
        { entryId, setId: "qwertz", append: true, completed: { reps: 8, weight: "105lb" } },
        clientHeaders
      );
      expect(appended.status).to.equal(200);
      const sets = appended.data.data.workout.entries[0].sets;
      expect(sets.length).to.equal(4);
      expect(sets[3].setId).to.equal("qwertz");
      expect(sets[3].completed.reps).to.equal(8);

      const replay = await req(
        "POST",
        "/api/v1/workout/set",
        { entryId, setId: "qwertz", append: true, completed: { reps: 8, weight: "105lb" } },
        clientHeaders
      );
      expect(replay.data.data.workout.entries[0].sets.length).to.equal(4);
    });

    it("rejects an appended setId that isn't the app's uid format", async () => {
      const started = await startWorkout();
      const { entryId } = firstWorkingSet(started.data.data.workout);
      const bad = await req(
        "POST",
        "/api/v1/workout/set",
        { entryId, setId: "NOT-A-UID-123", append: true, completed: { reps: 8 } },
        clientHeaders
      );
      expect(bad.status).to.equal(400);
      expect(bad.data.error.message).to.include("6 lowercase letters");
    });

    it("applies a batch in order in one call", async () => {
      const started = await startWorkout();
      const entry = started.data.data.workout.entries[0];
      const writes = entry.sets.map((s: any, i: number) => ({
        entryId: entry.entryId,
        setId: s.setId,
        completed: { reps: 5 - i, weight: "100lb" },
      }));

      const batch = await req("POST", "/api/v1/workout/sets", { sets: writes }, clientHeaders);
      expect(batch.status).to.equal(200);
      const sets = batch.data.data.workout.entries[0].sets;
      expect(sets.map((s: any) => s.completed.reps)).to.deep.equal([5, 4, 3]);
    });

    it("rejects a set write whose entryId disagrees with the set", async () => {
      const started = await startWorkout();
      const { setId } = firstWorkingSet(started.data.data.workout);
      const bad = await req(
        "POST",
        "/api/v1/workout/set",
        { entryId: "not_the_right_entry", setId, completed: { reps: 5 } },
        clientHeaders
      );
      expect(bad.status).to.equal(400);
      expect(bad.data.error.code).to.equal("invalid_input");
    });

    it("404s for an unknown setId", async () => {
      await startWorkout();
      const missing = await req(
        "POST",
        "/api/v1/workout/set",
        { setId: "zzzzzz", completed: { reps: 5 } },
        clientHeaders
      );
      expect(missing.status).to.equal(404);
      expect(missing.data.error.code).to.equal("set_not_found");
    });

    it("un-completes a set when completed is null", async () => {
      const started = await startWorkout();
      const { entryId, setId } = firstWorkingSet(started.data.data.workout);
      await req("POST", "/api/v1/workout/set", { entryId, setId, completed: { reps: 5 } }, clientHeaders);

      const uncompleted = await req("POST", "/api/v1/workout/set", { entryId, setId, completed: null }, clientHeaders);
      expect(uncompleted.status).to.equal(200);
      expect(uncompleted.data.data.workout.entries[0].sets[0].completed).to.equal(null);
    });

    it("discards only the workout the client names", async () => {
      const started = await startWorkout();
      const startTime = started.data.data.workout.startTime;

      const wrong = await req("DELETE", "/api/v1/workout/current", { startTime: startTime + 1 }, clientHeaders);
      expect(wrong.status).to.equal(409);
      const stillLive = await req("GET", "/api/v1/workout/current");
      expect(stillLive.data.data.workout).to.not.equal(null);

      const right = await req("DELETE", "/api/v1/workout/current", { startTime }, clientHeaders);
      expect(right.status).to.equal(200);
      const gone = await req("GET", "/api/v1/workout/current");
      expect(gone.data.data.workout).to.equal(null);
      // Discarding writes no history.
      const history = await req("GET", "/api/v1/history");
      expect(history.data.data.records.length).to.equal(0);
    });

    it("404s writing a set with no workout in progress", async () => {
      const noop = await req("POST", "/api/v1/workout/set", { setId: "abcdef", completed: { reps: 5 } }, clientHeaders);
      expect(noop.status).to.equal(404);
      expect(noop.data.error.code).to.equal("no_active_workout");
    });

    // Device id is the VersionTracker node identity (without it merges degrade to bare timestamps); the client
    // string is the record's only provenance and can't be backfilled. Both are required on writes.
    it("refuses writes missing either identity header", async () => {
      const noDevice = await req(
        "POST",
        "/api/v1/workout/start",
        { programId },
        {
          "X-Liftosaur-Client": "test-client/1.2.0",
        }
      );
      expect(noDevice.status).to.equal(400);
      expect(noDevice.data.error.message).to.include("X-Liftosaur-Device-Id");

      const noClient = await req(
        "POST",
        "/api/v1/workout/start",
        { programId },
        {
          "X-Liftosaur-Device-Id": "test-device-abc123",
        }
      );
      expect(noClient.status).to.equal(400);
      expect(noClient.data.error.message).to.include("X-Liftosaur-Client");

      const neither = await req("POST", "/api/v1/workout/start", { programId });
      expect(neither.status).to.equal(400);
      expect(neither.data.error.message).to.include("X-Liftosaur-Device-Id");
      expect(neither.data.error.message).to.include("X-Liftosaur-Client");

      // Reads are unaffected.
      expect((await req("GET", `/api/v1/workout/next?programId=${programId}`)).status).to.equal(200);
    });

    it("treats a different startTime on the same day as a different session", async () => {
      await startWorkout({ startTime: 1600000000000 });
      const other = await startWorkout({ startTime: 1600000999999 });
      expect(other.status).to.equal(409);
      expect(other.data.error.code).to.equal("workout_already_active");
    });

    it("returns settings a client would otherwise guess at", async () => {
      const settings = await req("GET", "/api/v1/settings");
      expect(settings.status).to.equal(200);
      expect(settings.data.data.units).to.be.oneOf(["kg", "lb"]);
      expect(settings.data.data).to.have.property("timers");
    });

    describe("engine-driven behaviour", () => {
      async function programWith(text: string): Promise<string> {
        const created = await req("POST", "/api/v1/programs", { name: `P${Date.now()}`, text });
        expect(created.status, JSON.stringify(created.data)).to.equal(201);
        return created.data.data.id;
      }

      it("resolves an AMRAP set with the reps the client reports", async () => {
        const pid = await programWith(`# Week 1
## Day 1
Squat / 1x5+ / 100lb`);
        const started = await req("POST", "/api/v1/workout/start", { programId: pid }, clientHeaders);
        expect(started.status).to.equal(200);
        const { entryId, setId } = firstWorkingSet(started.data.data.workout);
        expect(started.data.data.workout.entries[0].sets[0].isAmrap).to.equal(true);

        // On the phone this opens the AMRAP prompt and waits. The API has to answer it and finish the set.
        const logged = await req(
          "POST",
          "/api/v1/workout/set",
          { entryId, setId, completed: { reps: 9, weight: "100lb" } },
          clientHeaders
        );
        expect(logged.status).to.equal(200);
        expect(logged.data.data.workout.entries[0].sets[0].completed.reps).to.equal(9);
      });

      it("reports hasUpdateScript and returns the rewritten sets", async () => {
        const pid = await programWith(`# Week 1
## Day 1
Squat / 3x5 / 100lb / update: custom() {~ weights = 123lb ~}`);
        const started = await req("POST", "/api/v1/workout/start", { programId: pid }, clientHeaders);
        expect(started.data.data.workout.entries[0].hasUpdateScript).to.equal(true);

        const { entryId, setId } = firstWorkingSet(started.data.data.workout);
        const logged = await req(
          "POST",
          "/api/v1/workout/set",
          { entryId, setId, completed: { reps: 5, weight: "100lb" } },
          clientHeaders
        );
        expect(logged.status).to.equal(200);
        // The update script rewrote the remaining sets, which is why the client must adopt the response.
        // 123lb comes back as 122.5lb because the server rounds to what's actually loadable.
        expect(logged.data.data.workout.entries[0].sets[2].weight).to.equal("122.5lb");
      });

      // Parse-time errors are already rejected when the program is created, so this needs a script that parses
      // and throws at runtime — reading a set that doesn't exist yields undefined, which Weight_op refuses.
      // `store()` strips stats from the user row, so these have to be fetched separately — otherwise
      // `bodyweight` evaluates as 0 and the progression silently writes the wrong number.
      it("evaluates bodyweight in scripts against the user's real weight", async () => {
        const weighIn = await req("POST", "/api/v1/measurements/weight", { value: "200lb" });
        expect(weighIn.status, JSON.stringify(weighIn.data)).to.equal(201);

        const pid = await programWith(`# Week 1
## Day 1
Squat / 1x5 / 100lb / progress: custom() {~ rm1 = bodyweight ~}`);
        const started = await req("POST", "/api/v1/workout/start", { programId: pid }, clientHeaders);
        const startTime = started.data.data.workout.startTime;
        const { entryId, setId } = firstWorkingSet(started.data.data.workout);
        await req("POST", "/api/v1/workout/set", { entryId, setId, completed: { reps: 5 } }, clientHeaders);
        expect((await req("POST", "/api/v1/workout/finish", { startTime }, clientHeaders)).status).to.equal(200);

        const data = await req("GET", "/api/v1/exercise-data/squat_barbell");
        expect(data.data.data.rm1).to.equal("200lb");
      });

      it("keeps other exercise data when a finish-day script updates 1RM", async () => {
        const pid = await programWith(`# Week 1
## Day 1
Squat / 1x5 / 100lb / progress: custom() {~ rm1 = 250lb ~}`);
        // Finish-day scripts emit only { rm1 }, so a shallow merge here would drop the user's rounding.
        const put = await req("PUT", "/api/v1/exercise-data/squat_barbell", { rounding: 2.5 });
        expect(put.status, JSON.stringify(put.data)).to.equal(200);

        const started = await req("POST", "/api/v1/workout/start", { programId: pid }, clientHeaders);
        const startTime = started.data.data.workout.startTime;
        const { entryId, setId } = firstWorkingSet(started.data.data.workout);
        await req("POST", "/api/v1/workout/set", { entryId, setId, completed: { reps: 5 } }, clientHeaders);
        const finished = await req("POST", "/api/v1/workout/finish", { startTime }, clientHeaders);
        expect(finished.status).to.equal(200);

        const data = await req("GET", "/api/v1/exercise-data/squat_barbell");
        expect(data.data.data.rm1).to.equal("250lb");
        expect(data.data.data.rounding).to.equal(2.5);
      });

      // Some programs prompt the lifter for state vars, so the API has to carry them. The payload
      // advertises which ones; a write completing such a set has to supply each.
      describe("user-prompted state vars", () => {
        const PROMPTED = `# Week 1
## Day 1
Squat / 1x5 / 100lb / progress: custom(rpe+: 8, target+: 225lb) {~ weights = state.target ~}`;

        it("advertises the prompted vars on the entry", async () => {
          const pid = await programWith(PROMPTED);
          const started = await req("POST", "/api/v1/workout/start", { programId: pid }, clientHeaders);
          expect(started.status, JSON.stringify(started.data)).to.equal(200);
          // Types are inferable from the value: a number stays a number, a weight is a string.
          expect(started.data.data.workout.entries[0].promptedVars).to.deep.equal([
            { name: "rpe", value: 8 },
            { name: "target", value: "225lb" },
          ]);
        });

        it("accepts them and feeds them to the progression", async () => {
          const pid = await programWith(PROMPTED);
          const started = await req("POST", "/api/v1/workout/start", { programId: pid }, clientHeaders);
          const startTime = started.data.data.workout.startTime;
          const { entryId, setId } = firstWorkingSet(started.data.data.workout);

          const logged = await req(
            "POST",
            "/api/v1/workout/set",
            { entryId, setId, completed: { reps: 5, weight: "100lb", userVars: { rpe: 9, target: "245lb" } } },
            clientHeaders
          );
          expect(logged.status, JSON.stringify(logged.data)).to.equal(200);
          expect(logged.data.data.workout.entries[0].sets[0].completed.reps).to.equal(5);

          // The finish-day script reads state.target, so the supplied value has to have landed.
          expect((await req("POST", "/api/v1/workout/finish", { startTime }, clientHeaders)).status).to.equal(200);
          const program = await req("GET", `/api/v1/programs/${pid}`);
          expect(program.data.data.text).to.include("245lb");
        });

        it("400s naming every value the set asks for but the write omitted", async () => {
          const pid = await programWith(PROMPTED);
          const started = await req("POST", "/api/v1/workout/start", { programId: pid }, clientHeaders);
          const { entryId, setId } = firstWorkingSet(started.data.data.workout);

          const logged = await req(
            "POST",
            "/api/v1/workout/set",
            { entryId, setId, completed: { reps: 5, weight: "100lb", userVars: { rpe: 9 } } },
            clientHeaders
          );
          expect(logged.status).to.equal(400);
          expect(logged.data.error.code).to.equal("missing_set_input");
          expect(logged.data.error.message).to.include("userVars.target");
        });

        it("400s on an unparseable var value", async () => {
          const pid = await programWith(PROMPTED);
          const started = await req("POST", "/api/v1/workout/start", { programId: pid }, clientHeaders);
          const { entryId, setId } = firstWorkingSet(started.data.data.workout);

          const logged = await req(
            "POST",
            "/api/v1/workout/set",
            { entryId, setId, completed: { reps: 5, weight: "100lb", userVars: { rpe: 9, target: "heavy" } } },
            clientHeaders
          );
          expect(logged.status).to.equal(400);
          expect(logged.data.error.message).to.include("225lb");
        });
      });

      // Guessing here is how a 0lb set gets recorded, so the write has to supply what the set asks for.
      it("400s when an askWeight set is completed without a weight", async () => {
        const pid = await programWith(`# Week 1
## Day 1
Squat / 1x5 / 100lb / progress: lp(5lb)`);
        const started = await req("POST", "/api/v1/workout/start", { programId: pid }, clientHeaders);
        const { entryId, setId } = firstWorkingSet(started.data.data.workout);
        // A set with a programmed weight doesn't ask, so this one just completes.
        const ok1 = await req("POST", "/api/v1/workout/set", { entryId, setId, completed: { reps: 5 } }, clientHeaders);
        expect(ok1.status).to.equal(200);
        expect(ok1.data.data.workout.entries[0].sets[0].completed.weight).to.equal("100lb");
      });

      it("surfaces a failing update script as 422 instead of a silent 200", async () => {
        const pid = await programWith(`# Week 1
## Day 1
Squat / 3x5 / 100lb / update: custom() {~ weights = weights[99] + 1lb ~}`);
        const started = await req("POST", "/api/v1/workout/start", { programId: pid }, clientHeaders);
        expect(started.status).to.equal(200);
        const { entryId, setId } = firstWorkingSet(started.data.data.workout);

        const logged = await req(
          "POST",
          "/api/v1/workout/set",
          { entryId, setId, completed: { reps: 5, weight: "100lb" } },
          clientHeaders
        );
        expect(logged.status).to.equal(422);
        expect(logged.data.error.code).to.equal("program_error");
      });
    });
  });

  describe("writer identity", () => {
    it("namespaces the caller-supplied instance id under the credential", () => {
      const withInstance = ApiKeyAuth_deviceIdForKey("lftsk_secret", "Claude-Desktop");
      const withoutInstance = ApiKeyAuth_deviceIdForKey("lftsk_secret");

      expect(withInstance).to.match(/^api_[0-9a-f]{12}_claudedesktop$/);
      expect(withInstance.startsWith(`${withoutInstance}_`)).to.equal(true);
    });

    it("does not let a caller claim another writer's vector-clock node", () => {
      // Sending a real device's id must not produce that device's node, or the caller's writes would
      // land on its counters while it is offline with its own - a false causal ordering.
      const impersonating = ApiKeyAuth_deviceIdForKey("lftsk_secret", "web_jlhvfvus");
      expect(impersonating).to.not.equal("web_jlhvfvus");
      expect(impersonating.startsWith("api_")).to.equal(true);
    });

    it("keeps distinct keys on distinct nodes and one key stable", () => {
      expect(ApiKeyAuth_deviceIdForKey("lftsk_a")).to.not.equal(ApiKeyAuth_deviceIdForKey("lftsk_b"));
      expect(ApiKeyAuth_deviceIdForKey("lftsk_a")).to.equal(ApiKeyAuth_deviceIdForKey("lftsk_a"));
    });

    it("falls back to the credential node when the instance id is empty or unusable", () => {
      const base = ApiKeyAuth_deviceIdForKey("lftsk_secret");
      expect(ApiKeyAuth_deviceIdForKey("lftsk_secret", "")).to.equal(base);
      expect(ApiKeyAuth_deviceIdForKey("lftsk_secret", "!!!")).to.equal(base);
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
