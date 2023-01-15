import { g } from "../support/utils";

describe("Graphs", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.viewport("iphone-6");
  });

  it("edits sets properly", () => {
    cy.visit("https://local.liftosaur.com:8080");
    cy.contains("Pick or Create a Program").click();
    cy.get("button:contains('Basic Beginner Routine')").click();
    g("clone-program").click();
    g("footer-graphs").click();

    g("screen").should("contain.text", "Finish at least one workout to see the graphs");

    g("navbar-back").click();

    g("footer-cta").click();

    // Complete workout
    cy.get("[data-cy^=exercise-]:contains('Bent Over Row') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();
    cy.get("[data-cy^=exercise-]:contains('Bench Press') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();
    cy.get("[data-cy^=exercise-]:contains('Squat') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();
    cy.contains("Finish the workout").click();
    cy.contains("Continue").click();

    g("footer-graphs").click();

    g("screen").should("contain.text", "Select graphs you want to display");

    g("graphs-modify").click();

    g("item-graph-bent-over-row").click();
    g("item-graph-bench-press").click();

    g("modal-close").filter(":visible").click();

    g("graph").should("have.length", 2);
    g("graph").eq(0).find(".u-title").should("have.text", "Bent Over Row Max Weight");
    g("graph").eq(1).find(".u-title").should("have.text", "Bench Press Max Weight");

    g("graphs-modify").click();

    g("item-graph-exercise-bentoverrow").find("[data-cy=remove-graph]").click();
    g("item-graph-squat").click();

    g("modal-close").filter(":visible").click();

    g("graph").should("have.length", 2);
    g("graph").eq(0).find(".u-title").should("have.text", "Bench Press Max Weight");
    g("graph").eq(1).find(".u-title").should("have.text", "Squat Max Weight");
  });
});
