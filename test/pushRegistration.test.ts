import "mocha";
import { expect } from "chai";
import {
  IPushRegistrationEvent,
  IPushRegistrationState,
  PushRegistration_identityChanged,
  PushRegistration_initial,
  PushRegistration_next,
} from "../src/utils/pushRegistration";
import { buildState, IState } from "../src/models/state";
import { Storage_getDefault } from "../src/models/storage";

const identity = { userId: "u1", deviceId: "ios_a" };

function push(originalId: number, localOriginalId: number, deliveryId: string): IPushRegistrationEvent {
  return { type: "push", originalId, localOriginalId, deliveryId };
}

function run(
  events: IPushRegistrationEvent[],
  from?: IPushRegistrationState
): {
  state: IPushRegistrationState;
  effects: string[];
} {
  let state = from ?? PushRegistration_initial();
  const effects: string[] = [];
  for (const event of events) {
    const result = PushRegistration_next(state, event);
    state = result.state;
    for (const effect of result.effects) {
      switch (effect.type) {
        case "post":
          effects.push(`post:${effect.registration.deviceId}:${effect.registration.token}`);
          break;
        case "delete":
          effects.push(`delete:${effect.deviceId}`);
          break;
        case "sync":
          effects.push(`sync:${effect.originalId}`);
          break;
        case "complete":
          effects.push(`complete:${effect.deliveryIds.join("+")}:${effect.newData ? "new" : "none"}`);
          break;
      }
    }
  }
  return { state, effects };
}

describe("PushRegistration_next registration", () => {
  it("posts once the token and the identity are both known, in either order", () => {
    expect(
      run([
        { type: "token", token: "t" },
        { type: "identity", identity },
      ]).effects
    ).to.eql(["post:ios_a:t"]);
    expect(
      run([
        { type: "identity", identity },
        { type: "token", token: "t" },
      ]).effects
    ).to.eql(["post:ios_a:t"]);
  });

  it("posts nothing while logged out", () => {
    expect(
      run([
        { type: "token", token: "t" },
        { type: "identity", identity: undefined },
      ]).effects
    ).to.eql([]);
  });

  it("does not repeat a post that already succeeded for the same user, device and token", () => {
    const posted = { userId: "u1", deviceId: "ios_a", token: "t" };
    const { effects } = run([
      { type: "token", token: "t" },
      { type: "identity", identity },
      { type: "posted", posted },
      { type: "identity", identity },
      { type: "token", token: "t" },
    ]);
    expect(effects).to.eql(["post:ios_a:t"]);
  });

  it("posts again on the next identity event after a failed post, because lastPosted never got set", () => {
    const { effects } = run([
      { type: "token", token: "t" },
      { type: "identity", identity },
      { type: "identity", identity: { userId: "u1", deviceId: "ios_a" } },
    ]);
    expect(effects).to.eql(["post:ios_a:t", "post:ios_a:t"]);
  });

  it("posts again when the user changes or the token rotates", () => {
    const posted = { userId: "u1", deviceId: "ios_a", token: "t" };
    const { effects } = run([
      { type: "token", token: "t" },
      { type: "identity", identity },
      { type: "posted", posted },
      { type: "identity", identity: { userId: "u2", deviceId: "ios_a" } },
      { type: "posted", posted: { ...posted, userId: "u2" } },
      { type: "token", token: "t2" },
    ]);
    expect(effects).to.eql(["post:ios_a:t", "post:ios_a:t", "post:ios_a:t2"]);
  });

  it("deletes the posted device on signout and forgets the identity", () => {
    const posted = { userId: "u1", deviceId: "ios_a", token: "t" };
    const { state, effects } = run([
      { type: "token", token: "t" },
      { type: "identity", identity },
      { type: "posted", posted },
      { type: "signout" },
    ]);
    expect(effects).to.eql(["post:ios_a:t", "delete:ios_a"]);
    expect(state.identity).to.equal(undefined);
    expect(state.lastPosted).to.equal(undefined);
    expect(state.token).to.equal("t");
  });

  it("deletes nothing on signout when nothing was ever registered", () => {
    expect(run([{ type: "signout" }]).effects).to.eql([]);
  });
});

describe("PushRegistration_next pushes", () => {
  it("completes a push whose originalId the device already holds with no new data", () => {
    expect(run([push(5, 5, "d1")]).effects).to.eql(["complete:d1:none"]);
  });

  it("syncs once for a new originalId and completes the delivery after the sync", () => {
    const { state, effects } = run([push(6, 5, "d1"), { type: "syncDone", localOriginalId: 6 }]);
    expect(effects).to.eql(["sync:6", "complete:d1:new"]);
    expect(state.syncing).to.equal(false);
    expect(state.deliveries).to.eql([]);
  });

  it("coalesces pushes during a sync into one follow-up and completes every delivery at the end", () => {
    const { state, effects } = run([
      push(6, 5, "d1"),
      push(7, 5, "d2"),
      push(8, 5, "d3"),
      { type: "syncDone", localOriginalId: 7 },
      { type: "syncDone", localOriginalId: 8 },
    ]);
    expect(effects).to.eql(["sync:6", "sync:8", "complete:d1+d2+d3:new"]);
    expect(state.syncing).to.equal(false);
  });

  it("skips the follow-up when the sync already brought the pending originalId", () => {
    const { state, effects } = run([push(6, 5, "d1"), push(7, 5, "d2"), { type: "syncDone", localOriginalId: 7 }]);
    expect(effects).to.eql(["sync:6", "complete:d1+d2:new"]);
    expect(state.syncing).to.equal(false);
  });

  it("recovers after a sync that ended without bringing anything, so the next push syncs again", () => {
    const { effects } = run([push(6, 5, "d1"), { type: "syncDone", localOriginalId: 5 }, push(6, 5, "d2")]);
    expect(effects).to.eql(["sync:6", "complete:d1:new", "sync:6"]);
  });
});

describe("PushRegistration_identityChanged", () => {
  function stateWith(userId: string | undefined, deviceId: string, tempUserId?: string): IState {
    const storage = Storage_getDefault();
    if (tempUserId) {
      storage.tempUserId = tempUserId;
    }
    return buildState({ storage, userId, deviceId });
  }

  it("is false when neither the user nor the device changed", () => {
    expect(PushRegistration_identityChanged(stateWith("u1", "ios_a"), stateWith("u1", "ios_a"))).to.equal(false);
  });

  it("returns the new identity on login and on a device id change", () => {
    expect(PushRegistration_identityChanged(stateWith(undefined, "ios_a"), stateWith("u1", "ios_a"))).to.eql(identity);
    expect(PushRegistration_identityChanged(stateWith("u1", "ios_a"), stateWith("u1", "ios_b"))).to.eql({
      userId: "u1",
      deviceId: "ios_b",
    });
  });

  it("returns undefined on logout", () => {
    expect(PushRegistration_identityChanged(stateWith("u1", "ios_a"), stateWith(undefined, "ios_a"))).to.equal(
      undefined
    );
  });

  it("sees no change when a logged-out state becomes a debug sandbox, since neither registers", () => {
    expect(
      PushRegistration_identityChanged(stateWith(undefined, "ios_a"), stateWith("u1", "ios_a", "debug_abc"))
    ).to.equal(false);
  });

  it("treats entering and leaving a debug sandbox with the same user as identity changes", () => {
    expect(PushRegistration_identityChanged(stateWith("u1", "ios_a"), stateWith("u1", "ios_a", "debug_abc"))).to.equal(
      undefined
    );
    expect(PushRegistration_identityChanged(stateWith("u1", "ios_a", "debug_abc"), stateWith("u1", "ios_a"))).to.eql(
      identity
    );
    expect(
      PushRegistration_identityChanged(stateWith("u1", "ios_a", "debug_abc"), stateWith("u1", "ios_a", "debug_abc"))
    ).to.equal(false);
  });
});
