import { g } from "../support/utils";

describe("Basic Beginner Program", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.viewport("iphone-6");
  });

  it("increments and deloads properly", () => {
    cy.visit("https://local.liftosaur.com:8080");
    cy.contains("Pick or Create a Program").click();
    cy.get("button:contains('Basic Beginner Routine')").click();
    g("clone-program").click();
    g("footer-cta").click();

    // Workout A

    // First exercise is successful
    cy.get("[data-cy^=exercise-]:contains('Bent Over Row') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();

    cy.get("[data-cy^=exercise-]:contains('Bent Over Row') [data-cy=change-weight]").click();
    cy.get("[data-cy=modal-weight-input]").clear().type("140");
    cy.get("[data-cy=modal-weight-submit]").click();

    // Second exercise is successful
    cy.get("[data-cy^=exercise-]:contains('Squat') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();

    cy.get("[data-cy^=exercise-]:contains('Squat') [data-cy=change-weight]").click();
    cy.get("[data-cy=modal-weight-input]").clear().type("200");
    cy.get("[data-cy=modal-weight-submit]").click();

    cy.contains("Finish the workout").click();
    cy.contains("Continue").click();

    // Workout B

    g("footer-cta").click();

    // First exercise is successful
    cy.get("[data-cy^=exercise-]:contains('Chin Up') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();

    // Second exercise is successful
    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();

    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy=change-weight]").click();
    cy.get("[data-cy=modal-weight-input]").clear().type("250");
    cy.get("[data-cy=modal-weight-submit]").click();

    // Third exercise is unsuccessful
    cy.get("[data-cy^=exercise-]:contains('Overhead Press') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();
    cy.get("[data-cy^=exercise-]:contains('Overhead Press') [data-cy^=set-]").first().click();

    cy.get("[data-cy^=exercise-]:contains('Overhead Press') [data-cy=change-weight]").click();
    cy.get("[data-cy=modal-weight-input]").clear().type("100");
    cy.get("[data-cy=modal-weight-submit]").click();

    cy.contains("Finish the workout").click();
    cy.contains("Continue").click();

    // Check next exercise conditions
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-exercise]:contains('Bent Over Row') [data-cy=history-entry-weight]")
      .eq(0)
      .should("have.text", "142.5");
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-exercise]:contains('Squat') [data-cy=history-entry-weight]")
      .eq(0)
      .should("have.text", "205");
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-exercise]:contains('Bench Press') [data-cy=history-entry-weight]")
      .eq(0)
      .should("have.text", "45");

    // Workout A

    g("footer-cta").click();

    // First exercise is successful
    cy.get("[data-cy^=exercise-]:contains('Bent Over Row') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();

    // Second exercise is unsuccessful
    cy.get("[data-cy^=exercise-]:contains('Squat') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("3");
    cy.get("[data-cy=modal-amrap-submit]").click();

    // Third exercise is successful
    cy.get("[data-cy^=exercise-]:contains('Bench Press') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();

    cy.contains("Finish the workout").click();
    cy.contains("Continue").click();

    // Check next exercise conditions
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-exercise]:contains('Chin Up') [data-cy=history-entry-weight]")
      .eq(0)
      .should("have.text", "BW");
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-exercise]:contains('Deadlift') [data-cy=history-entry-weight]")
      .eq(0)
      .should("have.text", "255");
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-exercise]:contains('Overhead Press') [data-cy=history-entry-weight]")
      .eq(0)
      .should("have.text", "45");

    // Workout B

    g("footer-cta").click();

    cy.contains("Finish the workout").click();
    cy.contains("Continue").click();

    // Check next exercise conditions
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-exercise]:contains('Bent Over Row') [data-cy=history-entry-weight]")
      .eq(0)
      .should("have.text", "145");
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-exercise]:contains('Squat') [data-cy=history-entry-weight]")
      .eq(0)
      .should("have.text", "182.5");
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-exercise]:contains('Bench Press') [data-cy=history-entry-weight]")
      .eq(0)
      .should("have.text", "47.5");
  });
});
