import "mocha";
import { expect } from "chai";
import {
  FriendsWeb_presentation,
  FriendsWeb_programsUrl,
  FriendsWeb_rows,
  FriendsWeb_workoutsUrl,
} from "../src/models/friendsWeb";
import { IFollowing } from "../src/models/follow";
import { Settings_build } from "../src/models/settings";
import { FriendProgram_card } from "../src/models/friendProgram";
import { Program_create } from "../src/models/program";
import { PlannerProgram_evaluateText } from "../src/pages/planner/models/plannerProgram";

function following(userId: string, overrides: Partial<IFollowing> = {}): IFollowing {
  return { userId, permissions: { notes: false, programs: false }, ...overrides };
}

describe("FriendsWeb", () => {
  it("lists the most recently trained friends first, then by name", () => {
    const rows = FriendsWeb_rows([
      following("a", { nickname: "Zed", lastWorkoutAt: 100 }),
      following("b", { nickname: "Amy" }),
      following("c", { nickname: "Bob" }),
      following("d", { nickname: "Kim", lastWorkoutAt: 200 }),
    ]);
    expect(rows.map((r) => r.name)).to.eql(["Kim", "Zed", "Amy", "Bob"]);
  });

  it("names friends without a nickname 'A friend' and marks who shares programs", () => {
    const rows = FriendsWeb_rows([following("a", { permissions: { notes: false, programs: true } })]);
    expect(rows[0]).to.include({ userId: "a", name: "A friend", nickname: undefined, canEditPrograms: true });
  });

  it("shows the current program only for friends who share programs", () => {
    const rows = FriendsWeb_rows(
      [
        following("a", { nickname: "Amy", permissions: { notes: false, programs: true } }),
        following("b", { nickname: "Bob" }),
      ],
      { a: "5/3/1", b: "Hidden" }
    );
    expect(rows.map((r) => r.currentProgramName)).to.eql(["5/3/1", undefined]);
  });

  it("gives each page its path, document title and heading", () => {
    const base = { isMobile: false, account: { id: "me", isCurrent: true }, now: 0 };
    expect(FriendsWeb_presentation({ ...base, kind: "list", friends: [] })).to.eql({
      path: "/user/friends",
      documentTitle: "Friends | Liftosaur",
      heading: "Friends",
    });
    const programs = {
      ...base,
      kind: "programs" as const,
      ownerId: "a b",
      name: "Sam",
      programs: [],
      settings: Settings_build(),
    };
    expect(FriendsWeb_presentation(programs)).to.eql({
      path: "/user/friends/a%20b/programs",
      documentTitle: "Sam's programs | Liftosaur",
      heading: "Sam's programs",
    });
  });

  it("describes a program by its exercises and a weeks, days and exercises summary", () => {
    const text = "# Week 1\n## Day 1\nSquat / 3x5 / 100lb\nBench Press / 3x5 / 80lb\n## Day 2\nSquat / 3x5 / 100lb\n";
    const weeks = PlannerProgram_evaluateText(text);
    const program = {
      ...Program_create("Strength", "p1"),
      planner: { vtype: "planner" as const, name: "Strength", weeks },
    };
    const card = FriendProgram_card(program, Settings_build(), true);
    expect(card).to.include({ id: "p1", name: "Strength", isCurrent: true });
    expect(card.exerciseTypes.map((e) => e.id)).to.eql(["squat", "benchPress"]);
    expect(card.summary).to.contain("2 days");
  });

  it("builds escaped page urls", () => {
    expect(FriendsWeb_workoutsUrl("a/b")).to.equal("/user/friends/a%2Fb/workouts");
    expect(FriendsWeb_programsUrl("abc")).to.equal("/user/friends/abc/programs");
  });
});
