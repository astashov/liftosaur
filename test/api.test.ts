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

  describe("CORS", () => {
    it("returns CORS headers on OPTIONS", async () => {
      const result = await handler(buildEvent("OPTIONS", "/api/v1/history"), { getRemainingTimeInMillis: () => 10000 });
      expect(result.statusCode).to.equal(200);
      expect(result.headers?.["access-control-allow-origin"]).to.equal("*");
      expect(result.headers?.["access-control-allow-methods"]).to.include("GET");
    });
  });
});
