import { expect } from "chai";
import "mocha";
import {
  ProgramMarkdown_linkHeader,
  ProgramMarkdown_parseRouteId,
  ProgramMarkdown_render,
} from "../lambda/utils/programMarkdown";
import { IProgramIndexEntry } from "../src/models/program";

const entry: IProgramIndexEntry = {
  id: "gzclp",
  name: "GZCLP",
  author: "Cody Lefever",
  authorUrl: "",
  url: "https://www.liftosaur.com/programs/gzclp",
  shortDescription: "A next step  program.",
  description: "Intro, after [Basic Beginner](/programs/basicBeginner).\n\n<!-- more -->",
  isMultiweek: true,
  tags: [],
  frequency: 3,
  age: "3_to_12_months",
  duration: "45-60",
  goal: "strength",
  weeksCount: 1,
};

describe("ProgramMarkdown", () => {
  it("parses the .md suffix off the route id", () => {
    expect(ProgramMarkdown_parseRouteId("gzclp.md")).to.deep.equal({ id: "gzclp", isMarkdown: true });
    expect(ProgramMarkdown_parseRouteId("gzclp")).to.deep.equal({ id: "gzclp", isMarkdown: false });
    expect(ProgramMarkdown_parseRouteId(".md")).to.deep.equal({ id: ".md", isMarkdown: false });
  });

  it("builds the Link header", () => {
    expect(ProgramMarkdown_linkHeader("gzclp")).to.equal(
      '<https://www.liftosaur.com/programs/gzclp.md>; rel="alternate"; type="text/markdown"'
    );
  });

  it("renders facts, cleaned descriptions, faq and the program source", () => {
    const result = ProgramMarkdown_render({
      indexEntry: entry,
      fullDescription:
        'Do [{Squat}] and [{ Bench Press }].\n\n:::exercise-example{exercise="squat" key="t1"}\n\n\n\nMore.',
      faq: "### Is it good?\n\nYes.",
      programText: "# Week 1\n## Day 1\nSquat / 5x3 / 85%",
    });
    expect(result).to.equal(
      [
        "# GZCLP",
        "",
        "> A next step program.",
        "",
        "- Author: Cody Lefever",
        "- Frequency: 3 days a week",
        "- Workout length: 45-60 minutes",
        "- Goal: strength",
        "- Training experience: 3 to 12 months",
        "- Web page: https://www.liftosaur.com/programs/gzclp",
        "",
        "Intro, after [Basic Beginner](https://www.liftosaur.com/programs/basicBeginner).",
        "",
        "Do Squat and Bench Press.",
        "",
        "More.",
        "",
        "## FAQ",
        "",
        "### Is it good?",
        "",
        "Yes.",
        "",
        "## Program in Liftoscript",
        "",
        "This is the full program source. The language reference is at https://www.liftosaur.com/doc/liftoscript.",
        "",
        "```liftoscript",
        "# Week 1",
        "## Day 1",
        "Squat / 5x3 / 85%",
        "```",
        "",
      ].join("\n")
    );
  });

  it("skips unknown labels and lengthens the fence past backticks in the source", () => {
    const result = ProgramMarkdown_render({
      indexEntry: { ...entry, age: "forever", goal: undefined, frequency: 7, weeksCount: 12 },
      programText: "Squat / 3x5 // ```",
    });
    expect(result).to.not.include("Training experience");
    expect(result).to.not.include("Goal:");
    expect(result).to.not.include("Frequency:");
    expect(result).to.include("- Length: 12 weeks");
    expect(result).to.include("````liftoscript\nSquat / 3x5 // ```\n````");
  });
});
