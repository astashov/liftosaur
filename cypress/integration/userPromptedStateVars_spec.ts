import { g, clearCodeMirror, typeCodeMirror } from "../support/utils";

describe("User Prompted State Vars", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.viewport("iphone-6");
  });

  it("creates a new program and runs it", () => {
    cy.visit("https://local.liftosaur.com:8080?skipintro=1");

    // Creating the program

    g("create-program").click();

    g("modal-create-program-input").click().clear().type("A Program");
    g("modal-create-program-submit").click();

    cy.contains("Add New Exercise").click();
    g("tab-advanced").click();

    cy.contains("Add State Variable").click();
    g("modal-add-state-variable-input-name").clear().type("rpe");
    g("menu-item-name-user-prompted").click();
    g("modal-add-state-variable-submit").click();

    cy.contains("Add New Set").click();
    clearCodeMirror("multiline-editor-finish-day");
    typeCodeMirror(
      "multiline-editor-finish-day",
      "if (state.rpe > 7) {\n  state.weight = state.weight - 5lb\n} else if (state.rpe < 3) {\n  state.weight = state.weight + 5lb\n}"
    );

    g("save-program").click();
    g("edit-day").click();
    g("menu-item-squat").click();

    g("footer-workout").click();
    g("menu-item-a-program").click();

    g("start-workout").click();

    cy.get("[data-cy^=exercise-]:contains('Squat') [data-cy^=set-]").click({ multiple: true });
    g("modal-state-vars-user-prompt-input-rpe").clear().type("8");
    g("modal-state-vars-user-prompt-submit").click();
    g("state-changes").should("contain.text", "weight: 45 lb -> 40 lb");
    g("state-changes").should("contain.text", "rpe: 0 -> 8");
    cy.get("[data-cy^=exercise-]:contains('Squat') [data-cy^=set-]").eq(1).click();
    cy.get("[data-cy^=exercise-]:contains('Squat') [data-cy^=set-]").eq(1).click();
    cy.get("[data-cy^=exercise-]:contains('Squat') [data-cy^=set-]").eq(1).click();
    cy.get("[data-cy^=exercise-]:contains('Squat') [data-cy^=set-]").eq(1).click();
    cy.get("[data-cy^=exercise-]:contains('Squat') [data-cy^=set-]").eq(1).click();
    cy.get("[data-cy^=exercise-]:contains('Squat') [data-cy^=set-]").eq(1).click();
    cy.get("[data-cy^=exercise-]:contains('Squat') [data-cy^=set-]").eq(1).click();

    g("modal-state-vars-user-prompt-input-rpe").clear().type("2");
    g("modal-state-vars-user-prompt-submit").click();
    g("state-changes").should("contain.text", "weight: 45 lb -> 50 lb");
    g("state-changes").should("contain.text", "rpe: 0 -> 2");

    cy.contains("Finish the workout").click();
    cy.contains("Continue").click();

    g("start-workout").click();
    cy.get("[data-cy^=exercise-]:contains('Squat') [data-cy^=set-]")
      .eq(1)
      .find("[data-cy=weight-value]")
      .should("have.text", "50");

    cy.get("[data-cy^=exercise-]:contains('Squat') [data-cy^=set-]").click({ multiple: true });
    g("modal-state-vars-user-prompt-input-rpe").clear().type("5");
    g("modal-state-vars-user-prompt-submit").click();
    g("state-changes").should("not.contain.text", "weight");
    g("state-changes").should("contain.text", "rpe: 2 -> 5");
  });
});
