import { clearAll, g } from "../support/utils";

describe("Comments", () => {
  beforeEach(() => {
    clearAll();
  });

  it("leaves comments", () => {
    cy.visit("http://local.liftosaur.com:8080/?forceuseremail=test1@example.com");
    cy.contains("Pick or Create a Program").click();
    g("footer-settings").click();

    g("menu-item-account").click();
    g("menu-item-login").click();
    g("menu-item-current-account").should("have.text", "Current account: test1@example.com");

    cy.contains("Back").click();
    cy.contains("Back").click();
    g("menu-item-gzclp").click();
  });
});
