import { g } from "../support/utils";

describe("Edit Sets", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.viewport("iphone-6");
  });

  it("edits sets properly", () => {
    cy.visit("https://local.liftosaur.com:8080?skipintro=1");
    cy.get("button:contains('Basic Beginner Routine')").click();
    g("clone-program").click();
    g("start-workout").click();

    g("exercise-edit-mode").eq(1).click();
    g("modal-edit-mode-this-workout").click();
    g("add-warmup-set").click();
    g("modal-edit-set-reps-input").clear().type("10");
    g("modal-edit-set-weight-input").clear().type("100");
    g("modal-edit-set-submit").click();

    g("add-workout-set").click();
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

    // Adding and deleting exercises

    g("entry-bent-over-row").find("[data-cy=exercise-edit-mode]").click();
    g("modal-edit-mode-this-workout").click();
    g("delete-edit-exercise").click();
    g("entry-bent-over-row").should("not.exist");

    g("add-exercise-button").click();
    g("menu-item-arnold-press").click();
    g("change-exercise-equipment").select("kettlebell");

    g("add-workout-set").click();
    g("modal-edit-set-reps-input").clear().type("8");
    g("modal-edit-set-weight-input").clear().type("250");
    g("modal-edit-set-submit").click();

    const arnoldPressSelector = "[data-cy^=exercise-]:contains('Arnold Press') [data-cy^=set-]";
    cy.get(arnoldPressSelector).eq(0).find("[data-cy=reps-value]").should("have.text", "8");
    cy.get(arnoldPressSelector).eq(0).find("[data-cy=weight-value]").should("have.text", "40");
    cy.get(arnoldPressSelector).eq(0).should("have.data", "cy", "set-nonstarted");

    g("entry-squat").find("[data-cy=exercise-edit-mode]").click();
    g("menu-item-value-weight").clear().type("70");
    g("modal-edit-mode-save-statvars").click();

    g("entry-bent-over-row").should("not.exist");
    g("entry-arnold-press").should("exist");
    cy.get(arnoldPressSelector).eq(0).find("[data-cy=reps-value]").should("have.text", "8");

    cy.contains("Finish the workout").click();
    cy.contains("Continue").click();
  });
});
