import { g } from "../support/utils";

describe("Subscriptions", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.viewport("iphone-6");
  });

  it("works", () => {
    cy.visit("https://local.liftosaur.com:8080?skipintro=1&enforce=1");
    cy.get("button:contains('Basic Beginner Routine')").click();
    const adminKey = Cypress.env("LIFTOSAUR_ADMIN_KEY");
    g("clone-program").click();
    g("footer-graphs").click();

    cy.get("body").should("contain.text", "Liftosaur Premium");
    g("button-subscription-monthly").should("have.text", "$4.99/month");

    cy.window().then((win) => {
      return win.eval(`state.storage.subscription.key = 'test'`);
    });
    cy.wait(2000);
    cy.visit("https://local.liftosaur.com:8080?skipintro=1&enforce=1");
    g("footer-graphs").click();
    g("screen").should("contain.text", "Select graphs you want to display");
    g("footer-settings").click();
    g("menu-item-changelog").click();
    g("modal-close").filter(":visible").click();
    cy.wait(2000);
    g("footer-graphs").click();
    g("button-subscription-monthly").should("have.text", "$4.99/month");

    cy.window().then((win) => {
      return win.eval(`service.postAddFreeUser(window.state.storage.tempUserId, '${adminKey}')`);
    });

    cy.wait(2000);
    cy.visit("https://local.liftosaur.com:8080?skipintro=1&enforce=1");
    g("footer-graphs").click();
    g("button-subscription-free").click();
    g("footer-graphs").click();
    g("screen").should("contain.text", "Select graphs you want to display");
  });
});
