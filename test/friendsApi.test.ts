/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import JWT from "jsonwebtoken";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import sinon from "sinon";
import { getRawHandler, IHandler } from "../lambda";
import { buildMockDi, IMockDI } from "./utils/mockDi";
import { MockLogUtil } from "./utils/mockLogUtil";
import { MockFetch } from "./utils/mockFetch";
import { userTableNames, UserDao } from "../lambda/dao/userDao";
import { followTableNames } from "../lambda/dao/followDao";
import { reactionTableNames } from "../lambda/dao/reactionDao";
import { Storage_getDefault } from "../src/models/storage";
import { FriendsFixtures_entry, FriendsFixtures_record } from "./friendsFixtures";

function event(
  method: string,
  path: string,
  userId: string | undefined,
  opts?: { body?: unknown; qs?: Record<string, string> }
): APIGatewayProxyEvent {
  const headers: Record<string, string> = {};
  if (userId != null) {
    headers.Cookie = `session=${JWT.sign({ userId }, "cookieSecret")}`;
  }
  return {
    body: opts?.body ? JSON.stringify(opts.body) : null,
    headers,
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

function body(result: APIGatewayProxyResult): any {
  return JSON.parse(result.body);
}

describe("Friends API", () => {
  let sandbox: sinon.SinonSandbox;
  let di: IMockDI;
  let handler: IHandler;
  const ctx = { getRemainingTimeInMillis: (): number => 10000 };
  const call = (e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => handler(e, ctx);

  async function addUser(id: string, nickname: string): Promise<void> {
    const storage = Storage_getDefault();
    storage.tempUserId = id;
    storage.settings.nickname = nickname;
    await di.dynamo.put({
      tableName: userTableNames.prod.users,
      item: { id, email: `${id}@example.com`, createdAt: 1, storage },
    });
  }

  async function addRecord(userId: string, id: number, date: string, notes?: string): Promise<void> {
    const record = FriendsFixtures_record(id, date, {
      notes,
      entries: [FriendsFixtures_entry({ notes: notes ? `${notes} entry` : undefined })],
    });
    await di.dynamo.put({ tableName: userTableNames.prod.historyRecords, item: { ...record, userId } });
  }

  async function befriend(follower: string, followee: string, notes: boolean = false): Promise<string> {
    const invite = body(await call(event("POST", "/api/follow/invites", followee))).data;
    const request = body(await call(event("POST", `/api/follow/invites/${invite.token}/request`, follower))).data;
    await call(
      event("POST", `/api/follows/requests/${request.requestId}/approve`, followee, {
        body: { permissions: { notes }, followBack: false },
      })
    );
    return request.requestId;
  }

  beforeEach(async () => {
    (global as any).__API_HOST__ = "https://www.liftosaur.com";
    (global as any).__HOST__ = "https://www.liftosaur.com";
    (global as any).__ENV__ = "prod";
    (global as any).__FULL_COMMIT_HASH__ = "abc123";
    (global as any).__COMMIT_HASH__ = "abc123";
    (global as any).Rollbar = { configure: () => undefined };
    sandbox = sinon.createSandbox();
    let ts = 2000000000000;
    sandbox.stub(Date, "now").callsFake(() => {
      ts += 1;
      return ts;
    });
    const log = new MockLogUtil();
    const mockFetch = new MockFetch("anna", []);
    di = buildMockDi(log, mockFetch.fetch.bind(mockFetch));
    handler = getRawHandler(() => di);
    mockFetch.handler = handler;
    await addUser("anna", "Anna");
    await addUser("boris", "Boris");
    await addUser("carl", "Carl");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("rejects every endpoint without a session", async () => {
    expect((await call(event("POST", "/api/follow/invites", undefined))).statusCode).to.equal(401);
    expect((await call(event("GET", "/api/follows", undefined))).statusCode).to.equal(401);
    expect((await call(event("GET", "/api/feed", undefined))).statusCode).to.equal(401);
  });

  it("shows only the nickname before the follow is approved", async () => {
    const invite = body(await call(event("POST", "/api/follow/invites", "boris"))).data;
    expect(invite.url).to.equal(`https://www.liftosaur.com/f/${invite.token}`);
    const preview = await call(event("GET", `/api/follow/invites/${invite.token}`, "anna"));
    expect(body(preview).data).to.eql({ nickname: "Boris", isSelf: false });
    expect(preview.body).to.not.contain('boris"');
  });

  it("uses an invite once and returns the same request on retry", async () => {
    const invite = body(await call(event("POST", "/api/follow/invites", "boris"))).data;
    const first = body(await call(event("POST", `/api/follow/invites/${invite.token}/request`, "anna"))).data;
    const retry = body(await call(event("POST", `/api/follow/invites/${invite.token}/request`, "anna"))).data;
    expect(retry.requestId).to.equal(first.requestId);
    const other = await call(event("POST", `/api/follow/invites/${invite.token}/request`, "carl"));
    expect(other.statusCode).to.equal(404);
  });

  it("refuses an invite to yourself", async () => {
    const invite = body(await call(event("POST", "/api/follow/invites", "boris"))).data;
    const result = await call(event("POST", `/api/follow/invites/${invite.token}/request`, "boris"));
    expect(result.statusCode).to.equal(400);
  });

  it("lets only the followee approve", async () => {
    const invite = body(await call(event("POST", "/api/follow/invites", "boris"))).data;
    const request = body(await call(event("POST", `/api/follow/invites/${invite.token}/request`, "anna"))).data;
    const byFollower = await call(event("POST", `/api/follows/requests/${request.requestId}/approve`, "anna"));
    expect(byFollower.statusCode).to.equal(403);
    const byStranger = await call(event("POST", `/api/follows/requests/${request.requestId}/approve`, "carl"));
    expect(byStranger.statusCode).to.equal(403);
    const incoming = body(await call(event("GET", "/api/follows", "boris"))).data;
    expect(incoming.incoming.length).to.equal(1);
    expect(JSON.stringify(incoming.incoming)).to.not.contain("anna");
  });

  it("sends a pending request back on follow back", async () => {
    const invite = body(await call(event("POST", "/api/follow/invites", "boris"))).data;
    const request = body(await call(event("POST", `/api/follow/invites/${invite.token}/request`, "anna"))).data;
    await call(
      event("POST", `/api/follows/requests/${request.requestId}/approve`, "boris", {
        body: { permissions: { notes: false }, followBack: true },
      })
    );
    const anna = body(await call(event("GET", "/api/follows", "anna"))).data;
    expect(anna.following.map((f: any) => f.userId)).to.eql(["boris"]);
    expect(anna.incoming.length).to.equal(1);
    expect(anna.followers).to.eql([]);
  });

  it("serves followed workouts newest first and strips notes without permission", async () => {
    await befriend("anna", "boris", false);
    await addRecord("boris", 1000, "2026-11-01T10:00:00.000Z", "secret");
    await addRecord("boris", 2000, "2026-11-05T10:00:00.000Z");
    await addRecord("carl", 3000, "2026-11-06T10:00:00.000Z");
    const feed = body(await call(event("GET", "/api/feed", "anna"))).data;
    expect(feed.workouts.map((w: any) => w.recordId)).to.eql([2000, 1000]);
    expect(feed.owners.boris.nickname).to.equal("Boris");
    expect(JSON.stringify(feed)).to.not.contain("secret");
  });

  it("includes notes when the followee allows them", async () => {
    await befriend("anna", "boris", true);
    await addRecord("boris", 1000, "2026-11-01T10:00:00.000Z", "secret");
    const feed = body(await call(event("GET", "/api/feed", "anna"))).data;
    expect(feed.workouts[0].notes).to.equal("secret");
    expect(feed.workouts[0].exercises[0].notes).to.equal("secret entry");
  });

  it("pages the feed with a cursor without repeating or skipping workouts", async () => {
    await befriend("anna", "boris");
    for (let i = 1; i <= 5; i += 1) {
      await addRecord("boris", i * 1000, "2026-11-01T10:00:00.000Z");
    }
    const first = body(await call(event("GET", "/api/feed", "anna", { qs: { limit: "2" } }))).data;
    const second = body(
      await call(event("GET", "/api/feed", "anna", { qs: { limit: "2", cursor: first.cursor } }))
    ).data;
    const third = body(
      await call(event("GET", "/api/feed", "anna", { qs: { limit: "2", cursor: second.cursor } }))
    ).data;
    const ids = [...first.workouts, ...second.workouts, ...third.workouts].map((w: any) => w.recordId);
    expect(ids).to.eql([5000, 4000, 3000, 2000, 1000]);
  });

  it("lets followers and the owner react, and forbids strangers", async () => {
    await befriend("anna", "boris");
    await addRecord("boris", 1000, "2026-11-01T10:00:00.000Z");
    const ok = await call(event("PUT", "/api/reactions/boris/1000", "anna", { body: { reaction: "dino_fire" } }));
    expect(ok.statusCode).to.equal(200);
    const swap = await call(event("PUT", "/api/reactions/boris/1000", "anna", { body: { reaction: "dino_hug2" } }));
    expect(swap.statusCode).to.equal(200);
    const stranger = await call(event("PUT", "/api/reactions/boris/1000", "carl", { body: { reaction: "dino_pr" } }));
    expect(stranger.statusCode).to.equal(403);
    const bad = await call(event("PUT", "/api/reactions/boris/1000", "anna", { body: { reaction: "dino_nope" } }));
    expect(bad.statusCode).to.equal(400);
    const missing = await call(event("PUT", "/api/reactions/boris/9999", "anna", { body: { reaction: "dino_pr" } }));
    expect(missing.statusCode).to.equal(404);

    const own = body(await call(event("GET", "/api/reactions", "boris", { qs: { ids: "1000" } }))).data;
    expect(own["1000"].counts).to.eql({ dino_hug2: 1 });
    expect(own["1000"].reactors[0].nickname).to.equal("Anna");
  });

  it("hides reactions from people who no longer follow", async () => {
    await befriend("anna", "boris");
    await addRecord("boris", 1000, "2026-11-01T10:00:00.000Z");
    await call(event("PUT", "/api/reactions/boris/1000", "anna", { body: { reaction: "dino_fire" } }));
    await call(event("DELETE", "/api/follows/followers/anna", "boris"));
    const own = body(await call(event("GET", "/api/reactions", "boris", { qs: { ids: "1000" } }))).data;
    expect(own["1000"]).to.equal(undefined);
  });

  it("stops serving a removed follower", async () => {
    await befriend("anna", "boris");
    await addRecord("boris", 1000, "2026-11-01T10:00:00.000Z");
    await call(event("DELETE", "/api/follows/following/boris", "anna"));
    const feed = body(await call(event("GET", "/api/feed", "anna"))).data;
    expect(feed.workouts).to.eql([]);
  });

  it("removes follows and reactions with the account", async () => {
    await befriend("anna", "boris");
    await addRecord("boris", 1000, "2026-11-01T10:00:00.000Z");
    await call(event("PUT", "/api/reactions/boris/1000", "anna", { body: { reaction: "dino_fire" } }));
    await new UserDao(di).removeUser("anna");
    expect(Object.keys(di.dynamo.data[followTableNames.prod.follows] || {})).to.eql([]);
    expect(Object.keys(di.dynamo.data[reactionTableNames.prod.reactions] || {})).to.eql([]);
  });

  it("removes reactions when the workout is deleted", async () => {
    await befriend("anna", "boris");
    await addRecord("boris", 1000, "2026-11-01T10:00:00.000Z");
    await call(event("PUT", "/api/reactions/boris/1000", "anna", { body: { reaction: "dino_fire" } }));
    await new UserDao(di).deleteHistoryRecord("boris", 1000);
    expect(Object.keys(di.dynamo.data[reactionTableNames.prod.reactions] || {})).to.eql([]);
  });

  it("removes received reactions with the owner's account even when the workout is already gone", async () => {
    await befriend("anna", "boris");
    await addRecord("boris", 1000, "2026-11-01T10:00:00.000Z");
    await call(event("PUT", "/api/reactions/boris/1000", "anna", { body: { reaction: "dino_fire" } }));
    await di.dynamo.remove({ tableName: userTableNames.prod.historyRecords, key: { id: 1000, userId: "boris" } });
    await new UserDao(di).removeUser("boris");
    expect(Object.keys(di.dynamo.data[reactionTableNames.prod.reactions] || {})).to.eql([]);
  });

  it("serves the invite web page without exposing the inviter id", async () => {
    const invite = body(await call(event("POST", "/api/follow/invites", "boris"))).data;
    const page = await call(event("GET", `/f/${invite.token}`, undefined));
    expect(page.statusCode).to.equal(200);
    expect(page.body).to.contain("Boris invited you");
    expect(page.body).to.not.contain("boris");
    const expired = await call(event("GET", "/f/unknown-token", undefined));
    expect(expired.statusCode).to.equal(404);
  });
});
