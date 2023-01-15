import { g } from "../support/utils";

describe("Stats", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.viewport("iphone-6");
  });

  it("enters stats and shows graphs", () => {
    cy.visit("https://local.liftosaur.com:8080");
    cy.contains("Pick or Create a Program").click();
    cy.get("button:contains('Basic Beginner Routine')").click();
    g("clone-program").click();

    g("footer-measures").click();
    cy.contains("No measurements added yet").should("have.length", 1);

    g("footer-cta").click();
    g("modify-stats").click();
    g("menu-item-name-shoulders").click();
    g("menu-item-name-forearm-left").click();
    g("modal-close").filter(":visible").click();

    g("input-stats-neck").should("have.length", 0);

    g("input-stats-bodyweight").clear().type("10");
    g("input-stats-shoulders").clear().type("20");
    g("input-stats-forearm-left").clear().type("30");

    g("add-stats").click();

    g("footer-cta").click();
    g("input-stats-bodyweight").should("have.value", "10");
    g("input-stats-shoulders").should("have.value", "20");
    g("input-stats-forearm-left").should("have.value", "30");

    g("input-stats-bodyweight").clear().type("15");
    g("input-stats-shoulders").clear();
    g("input-stats-forearm-left").clear().type("35");
    g("add-stats").click();

    g("footer-cta").click();
    g("input-stats-bodyweight").should("have.value", "15");
    g("input-stats-shoulders").should("have.value", "20");
    g("input-stats-forearm-left").should("have.value", "35");

    g("input-stats-bodyweight").clear();
    g("input-stats-shoulders").clear();
    g("input-stats-forearm-left").clear().type("40");
    g("add-stats").click();

    g("input-stats-value").should("have.length", 2);
    g("input-stats-value").eq(0).should("have.value", "15");
    g("input-stats-value").eq(1).should("have.value", "10");
    g("input-stats-unit").should("have.length", 2);
    g("input-stats-unit").eq(0).should("have.text", "lb");
    g("input-stats-unit").eq(1).should("have.text", "lb");

    g("menu-item-name-type").click();
    g("menu-item-type", "scroll-barrel-item-shoulders").click();
    g("input-stats-value").should("have.length", 1);
    g("input-stats-value").eq(0).should("have.value", "20");
    g("input-stats-unit").eq(0).should("have.text", "in");

    g("menu-item-type", "scroll-barrel-item-forearmleft").click();
    g("input-stats-value").should("have.length", 3);
    g("input-stats-value").eq(0).should("have.value", "40");
    g("input-stats-value").eq(1).should("have.value", "35");
    g("input-stats-value").eq(2).should("have.value", "30");
    g("input-stats-unit").should("have.length", 3);
    g("input-stats-unit").eq(0).should("have.text", "in");
    g("input-stats-unit").eq(1).should("have.text", "in");
    g("input-stats-unit").eq(2).should("have.text", "in");

    g("delete-stat").eq(1).click();
    g("input-stats-value").should("have.length", 2);
    g("input-stats-value").eq(0).should("have.value", "40");
    g("input-stats-value").eq(1).should("have.value", "30");
    g("input-stats-unit").should("have.length", 2);
    g("input-stats-unit").eq(0).should("have.text", "in");
    g("input-stats-unit").eq(1).should("have.text", "in");

    g("footer-workouts").click({ force: true });
    g("footer-cta").click();
    cy.get("[data-cy^=exercise-]:contains('Bent Over Row') [data-cy^=set-]").eq(0).click();
    cy.contains("Finish the workout").click();
    cy.contains("Continue").click();

    g("footer-graphs").click();
    g("graphs-modify").click();

    g("item-graph-bent-over-row").should("have.length", 1);
    g("menu-item-bodyweight").should("have.length", 1);
    g("menu-item-shoulders").should("have.length", 1);
    g("menu-item-left-forearm").should("have.length", 1);
    g("menu-item-neck").should("have.length", 0);

    g("menu-item-shoulders").click();
    g("modal-close").filter(":visible").click();

    g("graph").should("have.length", 1);
    g("graph").eq(0).find(".u-title").should("have.text", "Shoulders");
  });
});
