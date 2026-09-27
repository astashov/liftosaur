import "mocha";
import { expect } from "chai";
import { Storage_getDefault } from "../src/models/storage";
import {
  ScreenshotsAccountStorage_build,
  ScreenshotsAccountStorage_email,
  ScreenshotsAccountStorage_id,
} from "../scripts/screenshots/accountStorage";

describe("ScreenshotsAccountStorage", () => {
  it("names the account from the simulator index", () => {
    expect(ScreenshotsAccountStorage_id(0)).to.equal("screenshots1");
    expect(ScreenshotsAccountStorage_email(2)).to.equal("feature-screenshots3@test.liftosaur.com");
  });

  it("stamps the fixture with the account, the premium key and the dismissed prompts", () => {
    const fixture = { ...Storage_getDefault(), tempUserId: "fixture", currentProgramId: "demo" };
    const storage = ScreenshotsAccountStorage_build(fixture, {
      id: "screenshots1",
      email: "feature-screenshots1@test.liftosaur.com",
      key: "key-abc",
      now: Date.UTC(2026, 8, 27, 12),
    });
    expect(storage.tempUserId).to.equal("screenshots1");
    expect(storage.email).to.equal("feature-screenshots1@test.liftosaur.com");
    expect(storage.subscription.key).to.equal("key-abc");
    expect(storage.currentProgramId).to.equal("demo");
    expect(storage.whatsNew).to.equal("20260927");
    expect(storage.hearAboutUs?.done).to.equal(true);
    expect(storage.helps).to.include("workout.howItWorks");
    expect(fixture.helps).to.not.include("workout.howItWorks");
  });
});
