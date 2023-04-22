import { g, clearCodeMirror, typeCodeMirror } from "../support/utils";

describe("Program", () => {
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

    g("modal-create-program-input").click().clear().type("My Program");
    g("modal-create-program-submit").click();

    g("edit-day").click();
    cy.contains("Create New Exercise").click();
    g("tab-advanced").click();

    cy.contains("Add State Variable").click();
    g("modal-add-state-variable-input-name").clear().type("lastrep");
    g("modal-add-state-variable-submit").click();

    cy.contains("Add New Set").click();
    cy.contains("Add New Set").click();

    g("menu-item-name-enable-quick-add-sets").click();

    clearCodeMirror("multiline-editor-finish-day");
    typeCodeMirror(
      "multiline-editor-finish-day",
      "if (numberOfSets > 4) {\n  state.weight = state.weight + 5\n}\nstate.lastrep = reps[ns]"
    );
    g("save-program").click();

    g("navbar-back").click();
    g("navbar-back").click();
    g("menu-item-my-program").click();

    // Running the program

    g("start-workout").click();
    cy.get("[data-cy^=exercise-]:contains('Squat') [data-cy^=set-]").click({ multiple: true });
    g("state-changes-value-lastrep").should("have.text", "0 -> 5");

    g("add-set").click();
    g("modal-edit-set-reps-input").clear().type("6");
    g("modal-edit-set-weight-input").clear().type("100");
    g("modal-edit-set-submit").click();
    g("state-changes-value-lastrep").should("have.text", "0 -> 6");
    g("state-changes-value-weight").should("not.be.visible");

    g("add-set").click();
    g("modal-edit-set-reps-input").clear().type("7");
    g("modal-edit-set-weight-input").clear().type("120");
    g("modal-edit-set-submit").click();
    g("state-changes-value-lastrep").should("have.text", "0 -> 7");
    g("state-changes-value-weight").should("have.text", "45 lb -> 50 lb");

    g("workout-set").should("have.length", 5);
  });
});
