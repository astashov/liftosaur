declare namespace Cypress {
  interface Chainable {
    clearIndexedDb(): Chainable<Element>;
  }
}
