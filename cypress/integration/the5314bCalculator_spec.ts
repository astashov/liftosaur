import { g } from "../support/utils";

describe("5/3/1 for beginners calculator", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.viewport("iphone-6");
  });

  it("works", () => {
    cy.visit("https://local.liftosaur.com:8080?skipintro=1");
    cy.contains("5/3/1 For Beginners").click();
    g("clone-program").click();
    g("squat-training-max-lb-input").clear().type("300");
    g("bench-press-calculate").click();
    g("input-reps").clear().type("5");
    g("input-weight").clear().type("300");
    cy.contains("Use this value").click();
    g("bench-press-training-max-lb-input").should("have.value", "315");
    cy.contains("Save").click();

    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-exercise]:contains('Squat') [data-cy=history-entry-weight]")
      .eq(2)
      .should("have.text", "255");
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-exercise]:contains('Bench Press') [data-cy=history-entry-weight]")
      .eq(2)
      .should("have.text", "267.5");
  });
});
