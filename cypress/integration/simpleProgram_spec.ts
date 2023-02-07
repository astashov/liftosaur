import { g } from "../support/utils";

describe("Program", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.viewport("iphone-6");
  });

  it("creates a new exercise using Simple editor", () => {
    cy.visit("https://local.liftosaur.com:8080");

    // Creating the program

    cy.contains("Pick or Create a Program").click();
    g("create-program").click();

    g("modal-create-program-input").clear().type("My Program");
    g("modal-create-program-submit").click();

    cy.contains("Add New Exercise").click();

    g("menu-item-exercise").click();
    g("modal-exercise").find("[data-cy='menu-item-deadlift']").click();
    g("menu-item-value-equipment").should("have.text", "Barbell");

    g("tab-advanced").click();

    cy.get("button").contains("Enable Sets Variations").click();
    cy.contains("Add New Variation").click();

    g("tab-simple").click();

    g("simple-errors").should("contain.text", "Should only have one variation");

    g("tab-advanced").click();

    g("menu-item-name-selected-variation").click();
    g("menu-item-selected-variation", "scroll-barrel-item-1").click();
    cy.contains("Delete Current Variation").click();

    g("tab-simple").click();

    g("sets-input").clear().type("5");
    g("reps-input").clear().type("3");
    g("weight-input").clear().type("80");

    cy.contains("Save").click();

    g("menu-item-day-1").find('[data-cy="edit-day"]').click();
    g("available-exercises").find("[data-cy=menu-item-deadlift]").click();
    g("selected-exercises").find("[data-cy=menu-item-deadlift]").should("exist");

    // Running the program

    g("navbar-back").click();
    g("navbar-back").click();

    g("menu-item-my-program").click();

    // Running the program

    g("start-workout").click();

    g("set-nonstarted").should("have.length", 5);
    g("set-nonstarted").should("have.length", 5);
    g("set-nonstarted").eq(0).find("[data-cy=reps-value]").should("have.text", 3);
    g("set-nonstarted").eq(0).find("[data-cy=weight-value]").should("have.text", 80);
    g("set-nonstarted").eq(4).find("[data-cy=reps-value]").should("have.text", 3);
    g("set-nonstarted").eq(4).find("[data-cy=weight-value]").should("have.text", 80);
  });
});
