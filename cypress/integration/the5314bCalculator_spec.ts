import { g } from "../support/utils";
import { getNewLibraryCopy } from "cypress/types/bluebird";

describe("5/3/1 for beginners calculator", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.viewport("iphone-6");
  });

  it("works", () => {
    cy.visit("http://local.liftosaur.com:8080");
    cy.contains("Let's choose a program!").click();
    cy.contains("5/3/1 For Beginners").click();
    cy.contains("Clone").click();
    g("menu-item-squat").find("input").clear().type("300");
    g("menu-item-bench-press").contains("Calculate").click();
    g("input-reps").clear().type("5");
    g("input-weight").clear().type("300");
    cy.contains("Use this value").click();
    g("menu-item-value-bench-press").should("have.value", "315");
    cy.contains("Save").click();

    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-exercise]:contains('Squat') [data-cy=history-entry-weight]")
      .should("have.text", "255");
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-exercise]:contains('Bench Press') [data-cy=history-entry-weight]")
      .should("have.text", "267.5");
  });
});
