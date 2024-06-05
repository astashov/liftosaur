import { g, s } from "../support/utils";

function finishExercise(name: string): void {
  cy.get(`[data-cy^=exercise-]:contains('${name}') [data-cy^=set-]`).click({ multiple: true });
  cy.get("[data-cy=modal-amrap-input]").clear().type("5");
  cy.get("[data-cy=modal-amrap-submit]").click();
}

function switchBackToFirstDay(): void {
  g("footer-program").click({ force: true });
  g("menu-item-name-next-day").click();
  g("scroll-barrel-item-week-1---workout-a").eq(0).click();
  g("navbar-back").click();
}

describe("Exercise Stats", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.viewport("iphone-6");
  });

  it("works", () => {
    cy.visit("https://local.liftosaur.com:8080/app/?skipintro=1");
    cy.get("button:contains('Basic Beginner Routine')").click();
    g("clone-program").click();
    g("start-workout").click();
    g("entry-bent-over-row").find(s("exercise-name")).click();
    g("exercise-stats-image").should("be.visible");
    g("max-weight-value").should("not.be.visible");
    g("one-rm-value").should("not.be.visible");
    g("history-entry-sets-completed").should("not.be.visible");
    g("graph-data").should("not.be.visible");

    g("navbar-back").click();
    finishExercise("Bent Over Row");
    finishExercise("Bench Press");
    finishExercise("Squat");
    cy.contains("Finish the workout").click();
    cy.contains("Continue").click();

    switchBackToFirstDay();

    g("start-workout").click();
    g("entry-bent-over-row").find(s("exercise-name")).click();
    g("menu-item-name-exercise").should("be.visible");
    g("exercise-stats-image").should("be.visible");
    g("max-weight-value").should("have.text", "95 lb");
    g("one-rm-value").should("have.text", "109.8 lb (5 x 95 lb)");
    g("history-entry-sets-completed").should("have.text", "3x5");
    g("graph-data").should("not.be.visible");

    g("navbar-back").click();
    finishExercise("Bent Over Row");
    finishExercise("Bench Press");
    finishExercise("Squat");
    cy.contains("Finish the workout").click();
    cy.contains("Continue").click();

    switchBackToFirstDay();

    g("start-workout").click();
    g("entry-bent-over-row").find(s("exercise-name")).click();
    g("max-weight-value").should("have.text", "97.5 lb");
    g("one-rm-value").should("have.text", "112.7 lb (5 x 97.5 lb)");
    g("history-entry-weight").eq(0).should("have.text", "97.5");
    g("exercise-stats-history-filter").click();
    g("menu-item-name-ascending-sort-by-date").click();
    g("history-entry-weight").eq(0).should("have.text", "95");
    g("graph-data").should("be.visible");
  });
});
