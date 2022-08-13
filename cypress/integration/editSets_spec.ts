import { g } from "../support/utils";

describe("Edit Sets", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.viewport("iphone-6");
  });

  it("edits sets properly", () => {
    cy.visit("http://local.liftosaur.com:8080");
    cy.contains("Pick or Create a Program").click();
    cy.get("button:contains('Basic Beginner Routine')").click();
    cy.contains("Clone").click();
    cy.contains("Start New Workout").click();
    cy.contains("Got it!").click();

    g("edit-exercise").eq(1).click();
    g("add-warmup-set").click();
    g("modal-edit-set-reps-input").clear().type("10");
    g("modal-edit-set-weight-input").clear().type("100");
    g("modal-edit-set-submit").click();

    g("add-set").click();
    g("modal-edit-set-reps-input").clear().type("20");
    g("modal-edit-set-weight-input").clear().type("200");
    g("modal-edit-set-amrap-input").click();
    g("modal-edit-set-submit").click();

    g("set-edit-mode-remove").eq(2).click();
    cy.get("[data-cy^=exercise-]:contains('Bench Press') [data-cy=set-nonstarted]").eq(1).click();
    g("modal-edit-set-reps-input").clear().type("8");
    g("modal-edit-set-weight-input").clear().type("80");
    g("modal-edit-set-submit").click();

    g("done-edit-exercise").click();

    // Checking the result

    const setsSelector = "[data-cy^=exercise-]:contains('Bench Press') [data-cy^=set-]";
    cy.get(setsSelector).eq(0).find("[data-cy=reps-value]").should("have.text", "10");
    cy.get(setsSelector).eq(0).find("[data-cy=weight-value]").should("have.text", "100");
    cy.get(setsSelector).eq(0).should("have.data", "cy", "set-nonstarted");

    cy.get(setsSelector).eq(1).find("[data-cy=reps-value]").should("have.text", "8");
    cy.get(setsSelector).eq(1).find("[data-cy=weight-value]").should("have.text", "80");
    cy.get(setsSelector).eq(1).should("have.data", "cy", "set-nonstarted");

    cy.get(setsSelector).eq(2).find("[data-cy=reps-value]").should("have.text", "5+");
    cy.get(setsSelector).eq(2).find("[data-cy=weight-value]").should("have.text", "45");
    cy.get(setsSelector).eq(2).should("have.data", "cy", "set-amrap-nonstarted");

    cy.get(setsSelector).eq(3).find("[data-cy=reps-value]").should("have.text", "20+");
    cy.get(setsSelector).eq(3).find("[data-cy=weight-value]").should("have.text", "200");
    cy.get(setsSelector).eq(3).should("have.data", "cy", "set-amrap-nonstarted");
  });
});
