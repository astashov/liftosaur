import "mocha";
import { expect } from "chai";
import {
  FriendFeedPage_beginLoad,
  FriendFeedPage_beginReaction,
  FriendFeedPage_canLoadMore,
  FriendFeedPage_finishLoad,
  FriendFeedPage_finishReaction,
  FriendFeedPage_init,
  FriendFeedPage_status,
  FriendFeedPage_workouts,
} from "../src/models/friendFeedPage";
import { FeedWorkout_fromRecord, FeedWorkout_key, IFeedResponse } from "../src/models/feedWorkout";
import { Settings_build } from "../src/models/settings";
import { FriendsFixtures_record } from "./friendsFixtures";

function feed(ids: number[], overrides: Partial<IFeedResponse> = {}): IFeedResponse {
  return {
    accountId: "me",
    workouts: ids.map((id) =>
      FeedWorkout_fromRecord(
        FriendsFixtures_record(id, `2026-11-0${(id % 9) + 1}T10:00:00.000Z`),
        Settings_build(),
        "sam",
        {
          notes: false,
          programs: false,
        }
      )
    ),
    reactions: {},
    owners: { sam: { nickname: "Sam" } },
    failedOwners: [],
    ...overrides,
  };
}

describe("FriendFeedPage", () => {
  it("loads the next page with the cursor, appends it, and stops when there is no cursor", () => {
    const page = FriendFeedPage_init("me", "sam", feed([1, 2], { cursor: "c1" }));
    expect(FriendFeedPage_canLoadMore(page)).to.equal(true);
    const started = FriendFeedPage_beginLoad(page);
    expect(started.request).to.eql({ owners: ["sam"], cursor: "c1" });
    expect(FriendFeedPage_beginLoad(started.page).request).to.equal(undefined);
    const loaded = FriendFeedPage_finishLoad(started.page, started.request!, { success: true, data: feed([3]) });
    expect(FriendFeedPage_workouts(loaded).map((w) => w.recordId)).to.eql([1, 2, 3]);
    expect(FriendFeedPage_canLoadMore(loaded)).to.equal(false);
  });

  it("reports a failed first load instead of an empty history, and retries with the kept cursor", () => {
    const page = FriendFeedPage_init("me", "sam", feed([], { failedOwners: ["sam"], cursor: "retry" }));
    expect(FriendFeedPage_status(page)).to.equal("failed");
    const started = FriendFeedPage_beginLoad(page);
    expect(started.request?.cursor).to.equal("retry");
    const failedAgain = FriendFeedPage_finishLoad(started.page, started.request!, { success: false, error: "network" });
    expect(FriendFeedPage_status(failedAgain)).to.equal("failed");
    const recovered = FriendFeedPage_finishLoad(started.page, started.request!, { success: true, data: feed([1]) });
    expect(FriendFeedPage_status(recovered)).to.equal("list");
    expect(FriendFeedPage_status(FriendFeedPage_init("me", "sam", feed([])))).to.equal("empty");
  });

  it("ignores a second reaction on a workout while the first is saving", () => {
    const page = FriendFeedPage_init("me", "sam", feed([1]));
    const fire = FriendFeedPage_beginReaction(page, { userId: "me" }, 1, "dino_fire");
    expect(fire.request).to.not.equal(undefined);
    expect(FriendFeedPage_beginReaction(fire.page, { userId: "me" }, 1, "dino_heart").request).to.equal(undefined);
    const saved = FriendFeedPage_finishReaction(fire.page, fire.request!, true);
    expect(FriendFeedPage_beginReaction(saved, { userId: "me" }, 1, "dino_heart").request).to.not.equal(undefined);
  });

  it("shows the reaction at once and takes it back when the save fails", () => {
    const page = FriendFeedPage_init("me", "sam", feed([1]));
    const key = FeedWorkout_key("sam", 1);
    const fire = FriendFeedPage_beginReaction(page, { userId: "me" }, 1, "dino_fire");
    expect(fire.page.social.reactions[key]?.total).to.equal(1);
    const failed = FriendFeedPage_finishReaction(fire.page, fire.request!, false);
    expect(failed.social.reactions[key]?.total ?? 0).to.equal(0);
    expect(failed.reactingKeys).to.eql([]);
  });
});
