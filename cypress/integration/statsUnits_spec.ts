import { g } from "../support/utils";

describe("Stats", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.viewport("iphone-6");
  });

  it("converts length units properly", () => {
    cy.visit("https://local.liftosaur.com:8080");
    cy.contains("Pick or Create a Program").click();
    cy.get("button:contains('Basic Beginner Routine')").click();
    cy.contains("Clone").click();

    g("footer-measures").click();
    g("footer-cta").click();
    g("modify-stats").click();
    g("menu-item-name-shoulders").click();
    g("menu-item-name-forearm-left").click();
    g("modal-close").filter(":visible").click();

    g("input-stats-bodyweight").clear().type("10.12");
    g("input-stats-shoulders").clear().type("20.34");
    g("input-stats-forearm-left").clear().type("30.56");
    g("add-stats").click();

    g("footer-settings").click();
    g("menu-item-value-length-units").should("have.text", "in");
    g("menu-item-name-length-units").click();
    g("menu-item-length-units", "scroll-barrel-item-cm").click();
    g("navbar-back").click();

    g("footer-cta").click();
    cy.contains("Shoulders (cm)").should("have.length", 1);
    g("input-stats-shoulders").should("have.value", 51.66);
    g("input-stats-shoulders").clear().type("40");
    g("add-stats").click();

    g("menu-item-name-type").click();
    g("menu-item-type", "scroll-barrel-item-shoulders").click();
    g("input-stats-value").should("have.length", 2);
    g("stats-list-shoulders").find("[data-cy='input-stats-value']").eq(0).should("have.value", "40");
    g("input-stats-value").eq(1).should("have.value", "51.66");
    g("input-stats-unit").eq(0).should("have.text", "cm");
    g("input-stats-unit").eq(1).should("have.text", "cm");

    g("footer-settings").click();
    g("menu-item-value-length-units").should("have.text", "cm");
    g("menu-item-name-length-units").click();
    g("menu-item-length-units", "scroll-barrel-item-in").click();
    cy.wait(200);
    g("navbar-back").click();

    g("menu-item-name-type").click();
    g("menu-item-type", "scroll-barrel-item-shoulders").click();
    g("input-stats-value").should("have.length", 2);
    g("stats-list-shoulders").find("[data-cy='input-stats-value']").eq(0).should("have.value", "15.75");
    g("input-stats-value").eq(1).should("have.value", "20.34");
    g("input-stats-unit").eq(0).should("have.text", "in");
    g("input-stats-unit").eq(1).should("have.text", "in");
  });
});
