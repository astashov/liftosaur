import { g, clearCodeMirror, typeCodeMirror } from "../support/utils";

describe("Program", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.viewport("iphone-6");
  });

  it("creates a new program and runs it", () => {
    cy.visit("http://local.liftosaur.com:8080");

    // Creating the program

    cy.contains("Let's choose a program!").click();
    cy.contains("Create new program").click();

    g("modal-create-program-input").clear().type("A Program");
    g("modal-create-program-submit").click();

    g("menu-item-value-name").clear().type("My Program");
    cy.contains("Add Day +").click();
    cy.contains("Back").click();
    cy.contains("Add Excercise +").click();

    g("menu-item-value-excercise").select("Deadlift");
    g("menu-item-value-bar").should("have.value", "barbell");
    g("menu-item-value-name").should("have.value", "Deadlift");

    cy.contains("Add Variable +").click();

    g("modal-add-state-variable-input-name").clear().type("weight");
    g("modal-add-state-variable-input-type").select("lb");
    g("modal-add-state-variable-submit").click();

    clearCodeMirror("oneline-editor-reps");
    typeCodeMirror("oneline-editor-reps", "8");
    clearCodeMirror("oneline-editor-weight");
    typeCodeMirror("oneline-editor-weight", "state.weight");

    g("menu-item-value-weight").clear().type("100");

    cy.contains("Add Set +").click();

    cy.contains("Add Variation +").click();
    clearCodeMirror("multiline-editor-variation");
    typeCodeMirror("multiline-editor-variation", "(state.weight > 100) ? 2 : 1");

    clearCodeMirror("oneline-editor-reps");
    typeCodeMirror("oneline-editor-reps", "10");
    clearCodeMirror("oneline-editor-weight");
    typeCodeMirror("oneline-editor-weight", "state.weight");

    clearCodeMirror("multiline-editor-finish-day");
    typeCodeMirror("multiline-editor-finish-day", "if (cr[1] == r[1]) {\n  state.weight = w[1] + 10lb\n}");

    g("menu-item-value-choose-day").select("2 - Day 2");
    cy.get("[data-cy^=excercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(1)
      .find("[data-cy=reps-value]")
      .should("have.text", "8");
    cy.get("[data-cy^=excercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(1)
      .find("[data-cy=weight-value]")
      .should("have.text", "100");
    cy.get("[data-cy^=excercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(2)
      .find("[data-cy=reps-value]")
      .should("have.text", "8");
    cy.get("[data-cy^=excercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(2)
      .find("[data-cy=weight-value]")
      .should("have.text", "100");

    cy.get("[data-cy^=excercise-]:contains('Deadlift') [data-cy^=set-]").eq(1).click();
    g("state-changes-value-weight").should("have.text", "100 lb -> 110 lb");
    cy.get("[data-cy^=excercise-]:contains('Deadlift') [data-cy^=set-]").eq(1).as("set");
    cy.get("[data-cy^=excercise-]:contains('Deadlift') [data-cy^=set-]").eq(1).click();
    g("state-changes-value-weight").should("not.exist");

    g("menu-item-value-weight").clear().type("110");
    g("menu-item-value-choose-day").select("1 - Day 1");

    cy.get("[data-cy^=excercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(1)
      .find("[data-cy=reps-value]")
      .should("have.text", "10");
    cy.get("[data-cy^=excercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(1)
      .find("[data-cy=weight-value]")
      .should("have.text", "110");
    cy.get("[data-cy^=excercise-]:contains('Deadlift') [data-cy^=set-]").eq(1).click();
    g("state-changes-value-weight").should("have.text", "110 lb -> 120 lb");

    g("menu-item-value-weight").clear().type("100");

    cy.contains("Save").click();
    g("menu-item-delete-day-2").click();
    g("menu-item-day-1").click();

    g("available-excercises").find("[data-cy=menu-item-deadlift]").click();
    g("selected-excercises").find("[data-cy=menu-item-deadlift]").should("exist");

    g("menu-item-value-name").clear().type("First Day");

    cy.contains("Back").click();
    cy.contains("Back").click();

    g("menu-item-my-program").click();

    // Running the program

    g("history-record-date").should("have.text", "Next");
    g("history-record-program").should("have.text", "My Program, First Day");
    cy.get("[data-cy=history-entry-excercise]:contains('Deadlift') [data-cy=history-entry-weight]").should(
      "have.text",
      "100"
    );
    cy.get("[data-cy=history-entry-excercise]:contains('Deadlift') [data-cy=history-entry-sets-next]").should(
      "have.text",
      "2x8"
    );

    cy.contains("Start Next Workout").click();

    cy.get("[data-cy^=excercise-]:contains('Deadlift') [data-cy^=set-]").click({ multiple: true });
    cy.contains("Finish the workout").click();

    // Check next excercise conditions
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-excercise]:contains('Deadlift') [data-cy=history-entry-weight]")
      .should("have.text", "110");
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-excercise]:contains('Deadlift') [data-cy=history-entry-sets-next]")
      .should("have.text", "1x10");
  });
});
