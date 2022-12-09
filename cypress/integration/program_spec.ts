import { g, clearCodeMirror, typeCodeMirror } from "../support/utils";

describe("Program", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.viewport("iphone-6");
  });

  it("creates a new program and runs it", () => {
    cy.visit("https://local.liftosaur.com:8080");

    // Creating the program

    cy.contains("Pick or Create a Program").click();
    g("footer-cta").click();

    g("modal-create-program-input").clear().type("A Program");
    g("modal-create-program-submit").click();

    g("menu-item-value-name").clear().type("My Program");
    cy.contains("Add New Day").click();
    g("navbar-back").click();
    cy.contains("Add New Exercise").click();
    cy.contains("Advanced").click();

    g("menu-item-exercise").click();
    g("modal-exercise").find("[data-cy='menu-item-deadlift']").click();
    g("menu-item-value-equipment").should("have.text", "Barbell");
    g("menu-item-value-name").should("have.value", "Deadlift");

    clearCodeMirror("oneline-editor-reps");
    typeCodeMirror("oneline-editor-reps", "8");
    clearCodeMirror("oneline-editor-weight");
    typeCodeMirror("oneline-editor-weight", "state.weight");

    g("menu-item-value-weight").clear().type("100");

    cy.contains("Add New Set").click();

    cy.contains("Enable Sets Variations").click();
    cy.contains("Add New Variation").click();
    clearCodeMirror("multiline-editor-variation");
    typeCodeMirror("multiline-editor-variation", "(state.weight > 100lb) ? 2 : 1");

    clearCodeMirror("oneline-editor-reps");
    typeCodeMirror("oneline-editor-reps", "10");
    clearCodeMirror("oneline-editor-weight");
    typeCodeMirror("oneline-editor-weight", "state.weight");

    clearCodeMirror("multiline-editor-finish-day");
    typeCodeMirror("multiline-editor-finish-day", "if (cr[1] == r[1]) {\n  state.weight = w[1] + 10lb\n}");

    g("menu-item-name-choose-day").click();
    g("menu-item-choose-day", "scroll-barrel-item-2").click();

    // Edit warmups
    g("edit-warmup-set").eq(0).find("[data-cy=edit-warmup-set-delete]").click();
    g("edit-warmup-set").eq(0).find("[data-cy=edit-warmup-set-delete]").click();
    g("edit-warmup-set").eq(0).find("[data-cy=edit-warmup-set-reps]").clear().type("9").blur();
    g("edit-warmup-set").eq(0).find("[data-cy=edit-warmup-set-value]").clear().type("150").blur();
    g("edit-warmup-set-add").click();
    g("edit-warmup-set").eq(0).find("[data-cy=edit-warmup-set-reps]").clear().type("7").blur();
    g("edit-warmup-set").eq(0).find("[data-cy=edit-warmup-set-value-unit]").select("lb");
    g("edit-warmup-set").eq(0).find("[data-cy=edit-warmup-set-value]").clear().type("120").blur();
    g("edit-warmup-set").eq(0).find("[data-cy=edit-warmup-set-threshold]").clear().type("110").blur();

    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]").should("have.length", 3);
    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(0)
      .find("[data-cy=reps-value]")
      .should("have.text", "9");
    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(0)
      .find("[data-cy=weight-value]")
      .should("have.text", "150");

    g("edit-warmup-set").eq(0).find("[data-cy=edit-warmup-set-threshold]").clear().type("95").blur();

    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]").should("have.length", 4);
    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(0)
      .find("[data-cy=reps-value]")
      .should("have.text", "7");
    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(0)
      .find("[data-cy=weight-value]")
      .should("have.text", "120");
    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(1)
      .find("[data-cy=reps-value]")
      .should("have.text", "9");
    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(1)
      .find("[data-cy=weight-value]")
      .should("have.text", "150");

    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(2)
      .find("[data-cy=reps-value]")
      .should("have.text", "8");
    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(2)
      .find("[data-cy=weight-value]")
      .should("have.text", "100");
    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(3)
      .find("[data-cy=reps-value]")
      .should("have.text", "8");
    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(3)
      .find("[data-cy=weight-value]")
      .should("have.text", "100");

    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]").eq(2).click();
    g("state-changes-value-weight").should("have.text", "100 lb -> 110 lb");
    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]").eq(2).as("set");
    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]").eq(2).click();
    g("state-changes-value-weight").should("not.exist");

    g("menu-item-value-weight").clear().type("110");
    g("menu-item-choose-day", "scroll-barrel-item-1").click();

    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(2)
      .find("[data-cy=reps-value]")
      .should("have.text", "10");
    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]")
      .eq(2)
      .find("[data-cy=weight-value]")
      .should("have.text", "110");
    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]").eq(2).click();
    g("state-changes-value-weight").should("have.text", "110 lb -> 120 lb");

    g("menu-item-value-weight").clear().type("100");

    cy.contains("Save").click();
    g("menu-item-delete-day-2").click();
    g("menu-item-day-1").find('[data-cy="edit-day"]').click();

    g("available-exercises").find("[data-cy=menu-item-deadlift]").click();
    g("selected-exercises").find("[data-cy=menu-item-deadlift]").should("exist");

    g("menu-item-value-name").clear().type("First Day");

    g("navbar-back").click();
    g("navbar-back").click();

    g("menu-item-my-program").click();

    // Running the program

    g("history-record-date").should("have.text", "Next");
    g("history-record-program").should("have.text", "My Program, First Day");
    cy.get("[data-cy=history-entry-exercise]:contains('Deadlift') [data-cy=history-entry-weight]").should(
      "have.text",
      "100"
    );
    cy.get("[data-cy=history-entry-exercise]:contains('Deadlift') [data-cy=history-entry-sets-next]").should(
      "have.text",
      "2x8"
    );

    g("footer-cta").click();

    cy.get("[data-cy^=exercise-]:contains('Deadlift') [data-cy^=set-]").click({ multiple: true });

    cy.contains("Finish the workout").click();
    cy.contains("Continue").click();

    // Check next exercise conditions
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-exercise]:contains('Deadlift') [data-cy=history-entry-weight]")
      .should("have.text", "110");
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-exercise]:contains('Deadlift') [data-cy=history-entry-sets-next]")
      .should("have.text", "1x10");
  });
});
