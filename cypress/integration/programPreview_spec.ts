import { g, s } from "../support/utils";

describe("Basic Beginner Program", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.viewport("iphone-6");
  });

  it("increments and deloads properly", () => {
    cy.visit("https://local.liftosaur.com:8080?skipintro=1");
    cy.get("button:contains('Basic Beginner Routine')").click();
    g("preview-program").click();
    g("program-name").should("have.text", "Basic Beginner Routine");
    g("program-author").should("have.text", "By /r/fitness");
    g("day-1").find(s("program-day-name")).should("have.text", "1. Workout A");

    g("day-1").find(s("program-show-day-muscles")).click();
    cy.contains("Muscles for day 'Workout A'");
    g("modal-close").click();

    g("day-1").find(s("bent-over-row")).find(s("history-entry-sets-next")).filter(":eq(0)").should("have.text", "5x2");
    g("day-1").find(s("bent-over-row")).find(s("history-entry-weight")).filter(":eq(0)").should("have.text", "65");
    g("day-1").find(s("bent-over-row")).find(s("finish-day-script")).should("not.be.visible");
    g("day-1").find(s("bent-over-row")).find(s("program-exercise-show-fx")).click();
    g("day-1")
      .find(s("bent-over-row"))
      .find(s("history-entry-weight"))
      .filter(":eq(0)")
      .should("have.text", "state.weight");
    g("day-1").find(s("bent-over-row")).find(s("finish-day-script")).should("be.visible");
    g("day-1").find(s("bent-over-row")).find(s("exercise-progress")).should("not.be.visible");
    g("day-1").find(s("bent-over-row")).find(s("program-exercise-show-playground")).click();
    g("day-1").find(s("bent-over-row")).find(s("exercise-progress")).should("be.visible");
    g("day-1").find(s("bent-over-row")).find(s("set-nonstarted")).click({ multiple: true });
    g("day-1").find(s("bent-over-row")).find(s("set-amrap-nonstarted")).click();
    g("modal-amrap-input").clear().type("5");
    g("modal-amrap-submit").click();
    g("day-1")
      .find(s("bent-over-row"))
      .find(s("state-changes-key-weight"))
      .should("have.text", "weight: 65 lb -> 67.5 lb");
    g("day-1").find(s("bent-over-row")).find(s("state-var-weight-input")).clear().type("70");
    g("day-1")
      .find(s("bent-over-row"))
      .find(s("set-completed"))
      .filter(":eq(0)")
      .find(s("weight-value"))
      .should("have.text", "70");
    g("day-1").find(s("bent-over-row")).find(s("program-exercise-show-fx")).click();
    g("day-1").find(s("bent-over-row")).find(s("history-entry-weight")).filter(":eq(0)").should("have.text", "70");

    g("program-show-muscles").click();
    cy.contains("Muscles for program 'Basic Beginner Routine'");
    g("modal-close").filter(":visible").click();

    g("program-show-fx").click();
    g("day-1")
      .find(s("bent-over-row"))
      .find(s("history-entry-weight"))
      .filter(":eq(0)")
      .should("have.text", "state.weight");
    g("day-2")
      .find(s("overhead-press"))
      .find(s("history-entry-weight"))
      .filter(":eq(0)")
      .should("have.text", "state.weight");

    g("menu-item-name-program").click();
    g("menu-item-program", "scroll-barrel-item-gzclp").click();
    g("program-name").should("have.text", "GZCLP");
    g("day-1").find(s("tier-1-squat")).find(s("program-exercise-name")).should("have.text", "1. Tier 1 Squat");

    g("navbar-back").click();
    cy.get("button:contains('Basic Beginner Routine')").click();
    g("clone-program").click();
    g("footer-program").click();
    g("navbar-3-dot").click();
    g("bottom-sheet-preview-program").click();
    g("program-name").should("have.text", "Basic Beginner Routine");
  });
});
