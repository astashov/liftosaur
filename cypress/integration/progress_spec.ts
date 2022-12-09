import { g } from "../support/utils";

describe("Progress", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.viewport("iphone-6");
  });

  it("Clones a program and goes through first day", () => {
    cy.visit("https://local.liftosaur.com:8080");
    cy.contains("Pick or Create a Program").click();
    cy.get("button:contains('Basic Beginner Routine')").click();
    cy.contains("Clone").click();
    g("footer-cta").click();

    // Testing set clicks
    cy.get("[data-cy^=exercise-]:contains('Bent Over Row') [data-cy^=set-]").first().as("firstset");
    cy.get("@firstset").find("[data-cy=reps-value]").should("have.text", "5");
    cy.get("@firstset").find("[data-cy=weight-value]").should("have.text", "95");
    cy.get("@firstset").should("have.data", "cy", "set-nonstarted");
    cy.get("@firstset").click();
    cy.get("@firstset").find("[data-cy=reps-value]").should("have.text", "5");
    cy.get("@firstset").should("have.data", "cy", "set-completed");
    cy.get("@firstset").click();
    cy.get("@firstset").find("[data-cy=reps-value]").should("have.text", "4");
    cy.get("@firstset").should("have.data", "cy", "set-incompleted");
    cy.get("@firstset").click();
    cy.get("@firstset").click();
    cy.get("@firstset").click();
    cy.get("@firstset").find("[data-cy=reps-value]").should("have.text", "1");
    cy.get("@firstset").find("[data-cy=weight-value]").should("have.text", "95");
    cy.get("@firstset").should("have.data", "cy", "set-incompleted");
    cy.get("@firstset").click();
    cy.get("@firstset").click();
    cy.get("@firstset").find("[data-cy=reps-value]").should("have.text", "5");
    cy.get("@firstset").find("[data-cy=weight-value]").should("have.text", "95");
    cy.get("@firstset").should("have.data", "cy", "set-nonstarted");
    cy.get("@firstset").click();
    cy.get("@firstset").find("[data-cy=reps-value]").should("have.text", "5");
    cy.get("@firstset").should("have.data", "cy", "set-completed");
    cy.get("@firstset").click();
    cy.get("@firstset").find("[data-cy=reps-value]").should("have.text", "4");
    cy.get("@firstset").should("have.data", "cy", "set-incompleted");

    cy.get("[data-cy^=exercise-]:contains('Bent Over Row') [data-cy^=set-]").eq(1).click();

    // Testing AMRAP set clicks
    cy.get("[data-cy^=exercise-]:contains('Bent Over Row') [data-cy^=set-]").eq(2).as("thirdSet");
    cy.get("@thirdSet").find("[data-cy=reps-value]").should("have.text", "5+");
    cy.get("@thirdSet").should("have.data", "cy", "set-amrap-nonstarted");
    cy.get("@thirdSet").click();
    cy.get("[data-cy=modal-amrap-input]").clear().type("8");
    cy.get("[data-cy=modal-amrap-submit]").click();

    cy.get("@thirdSet").find("[data-cy=reps-value]").should("have.text", "8");
    cy.get("@thirdSet").find("[data-cy=reps-completed-amrap]").should("have.text", "5+");
    cy.get("@thirdSet").should("have.data", "cy", "set-amrap-completed");
    cy.get("@thirdSet").click();
    cy.get("[data-cy=modal-amrap-clear]").click();
    cy.get("@thirdSet").find("[data-cy=reps-value]").should("have.text", "5+");
    cy.get("@thirdSet").should("have.data", "cy", "set-amrap-nonstarted");
    cy.get("@thirdSet").click();
    cy.get("[data-cy=modal-amrap-input]").clear().type("2");
    cy.get("[data-cy=modal-amrap-submit]").click();
    cy.get("@thirdSet").should("have.data", "cy", "set-amrap-incompleted");

    // Testing changing weight
    cy.get("[data-cy^=exercise-]:contains('Bent Over Row') [data-cy=change-weight]").click();
    cy.get("[data-cy=modal-weight-input]").clear().type("200");
    cy.get("[data-cy=modal-weight-submit]").click();

    cy.get("[data-cy^=exercise-]:contains('Bent Over Row') [data-cy^=set-]").as("sets");
    cy.get("@sets").eq(3).find("[data-cy=weight-value]").should("have.text", "200");
    cy.get("@sets").eq(4).find("[data-cy=weight-value]").should("have.text", "200");
    cy.get("@sets").eq(5).find("[data-cy=weight-value]").should("have.text", "200");

    // Testing warmup weights
    cy.get("[data-cy^=exercise-]:contains('Bent Over Row') [data-cy=warmup-set]").as("set-containers");
    cy.get("@set-containers").eq(0).find("[data-cy=warmup-set-title]").should("have.text", "Warmup");
    cy.get("@set-containers").eq(0).find("[data-cy=weight-value]").should("have.text", "60");
    cy.get("@set-containers").eq(1).find("[data-cy=warmup-set-title]").should("have.text", "Warmup");
    cy.get("@set-containers").eq(1).find("[data-cy=weight-value]").should("have.text", "100");
    cy.get("@set-containers").eq(2).find("[data-cy=warmup-set-title]").should("have.text", "Warmup");
    cy.get("@set-containers").eq(2).find("[data-cy=weight-value]").should("have.text", "160");

    // Completing the rest exercises
    cy.get("[data-cy^=exercise-]:contains('Bench Press') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();

    cy.get("[data-cy^=exercise-]:contains('Squat') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();

    cy.contains("Finish the workout").click();
    cy.contains("Continue").click();

    // Checking the history record
    cy.get("[data-cy=history-entry-exercise]:contains('Bent Over Row')").as("history-entry");
    cy.get("@history-entry").find("[data-cy=history-entry-sets-incompleted]").should("have.text", "4/5/2");
    cy.get("@history-entry").find("[data-cy=history-entry-weight]").should("have.text", "200");
    cy.get("[data-cy=history-entry-exercise]:contains('Squat') [data-cy=history-entry-sets-completed]").should(
      "have.text",
      "3x5"
    );
    cy.get("[data-cy=history-entry-exercise]:contains('Squat') [data-cy=history-entry-weight]").should(
      "have.text",
      "45"
    );
  });
});
