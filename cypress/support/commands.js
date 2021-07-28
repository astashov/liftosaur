// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

Cypress.Commands.add(
  "clearIndexedDb",
  () =>
    new Cypress.Promise(async (resolve) => {
      const req = indexedDB.deleteDatabase("keyval-store");
      req.addEventListener("success", () => {
        console.log("Cleared indexedDb");
        resolve();
      });
      req.addEventListener("error", (event) => {
        console.log("Error deleting database.");
        console.log(event);
      });
      req.addEventListener("blocked", (event) => {
        console.log("Blocked deleting database.");
        console.log(event);
      });
    })
);
